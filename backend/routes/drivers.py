import logging
import httpx
import math

from uuid import UUID
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from database import get_supabase_admin
from security import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/drivers",
    tags=["Driver Management"]
)


# =====================================
# REQUEST MODELS
# =====================================

class DriverApplication(BaseModel):
    license_number: str = Field(
        min_length=5,
        max_length=30
    )


class DriverAvailabilityRequest(BaseModel):
    is_online: bool


class DriverLocationRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    accuracy_meters: float = Field(gt=0, le=1000000)
    
# =====================================
# USER SUPABASE CLIENT
# =====================================

def get_user_supabase(current_user):

    client = getattr(
        current_user,
        "_gloigo_supabase",
        None
    )

    if client is None:
        raise HTTPException(
            status_code=500,
            detail="User database connection unavailable"
        )

    return client


# =====================================
# CHECK DRIVER ELIGIBILITY
# =====================================

def require_eligible_driver(client):

    try:
        response = client.rpc(
            "is_eligible_driver", {}
        ).execute()

        if response.data is not True:
            raise HTTPException(
                status_code=403,
                detail="Driver must be approved, online and have an available van"
            )

    except HTTPException:
        raise

    except Exception:
        logger.exception("DRIVER ELIGIBILITY CHECK ERROR")

        raise HTTPException(
            status_code=500,
            detail="Unable to verify driver availability"
        )


# =====================================
# DRIVER APPLICATION
# =====================================


@router.post("/apply")
def apply_as_driver(
    data: DriverApplication,
    current_user=Depends(get_current_user)
):
    client = get_user_supabase(current_user)
    user_id = str(current_user.id)

    # Verify that the account has the driver role
    profile_response = (
        client.table("profiles")
        .select("role")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )

    if (
        not profile_response.data
        or profile_response.data.get("role") != "driver"
    ):
        raise HTTPException(
            status_code=403,
            detail="Only registered driver accounts can submit an application."
        )

    try:
        client.table("driver_profiles").insert({
            "user_id": user_id,
            "license_number": data.license_number.strip(),
            "verification_status": "pending",
            "is_online": False
        }).execute()

        return {
            "message": "Driver application submitted successfully",
            "user_id": user_id,
            "verification_status": "pending"
        }

    except Exception:
        logger.exception("DRIVER APPLICATION ERROR")

        raise HTTPException(
            status_code=400,
            detail="Application failed. You may have already applied or the data is invalid."
        )


# =====================================
# GET DRIVER APPLICATION
# =====================================

@router.get("/me")
def get_driver_application(
    current_user=Depends(get_current_user)
):
    client = get_user_supabase(current_user)

    try:
        response = (
            client.table("driver_profiles")
            .select("*")
            .eq("user_id", str(current_user.id))
            .limit(1)
            .execute()
        )

        rows = response.data or []

        if not rows:
            raise HTTPException(
                status_code=404,
                detail="Driver application not found"
            )

        return rows[0]

    except HTTPException:
        raise

    except Exception:
        logger.exception("DRIVER PROFILE ERROR")

        raise HTTPException(
            status_code=500,
            detail="Unable to fetch driver application"
        )

# =====================================
# DRIVER ONLINE / OFFLINE
# =====================================

@router.patch("/availability")
def update_driver_availability(
    data: DriverAvailabilityRequest,
    current_user=Depends(get_current_user)
):

    client = get_user_supabase(current_user)

    user_id = str(current_user.id)

    try:
        application = (
            client.table("driver_profiles")
            .select("verification_status, is_online")
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )

        if not application.data:
            raise HTTPException(
                status_code=404,
                detail="Driver application not found"
            )

        if application.data["verification_status"] != "approved":
            raise HTTPException(
                status_code=403,
                detail="Admin approval required"
            )

        if data.is_online:

            van = (
                client.table("vans")
                .select("id")
                .eq("driver_id", user_id)
                .eq("status", "available")
                .limit(1)
                .execute()
            )

            if not van.data:
                raise HTTPException(
                    status_code=409,
                    detail="No operational van assigned. Contact admin."
                )

            if not data.is_online:
                client.table("driver_locations") \
                .delete() \
                .eq("driver_id", user_id) \
                .execute()

        response = (
            client.table("driver_profiles")
            .update({"is_online": data.is_online})
            .eq("user_id", user_id)
            .eq("verification_status", "approved")
            .select(
                "user_id, is_online, verification_status"
            )
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=403,
                detail="Unable to update availability"
            )

        return {
            "message": (
                "Driver is now online"
                if data.is_online
                else "Driver is now offline"
            ),
            "driver": response.data[0]
        }

    except HTTPException:
        raise

    except Exception:
        logger.exception("DRIVER AVAILABILITY ERROR")

        raise HTTPException(
            status_code=400,
            detail="Unable to update driver availability"
        )



# =====================================
# GET DRIVER BOOKINGS
# =====================================

@router.get("/bookings")
def get_driver_bookings(
    current_user=Depends(get_current_user)
):
    client = get_user_supabase(current_user)
    user_id = str(current_user.id)

    try:
        # Verify driver approval and online status
        driver_response = (
            client.table("driver_profiles")
            .select("verification_status, is_online")
            .eq("user_id", user_id)
            .maybe_single()
            .execute()
        )

        if not driver_response.data:
            raise HTTPException(
                status_code=404,
                detail="Driver application not found"
            )

        driver = driver_response.data

        if driver["verification_status"] != "approved":
            raise HTTPException(
                status_code=403,
                detail="Admin approval required"
            )

        if not driver["is_online"]:
            raise HTTPException(
                status_code=403,
                detail="Go online to view bookings"
            )

        # Fetch active booking assigned to this driver
        active_response = client.rpc(
            "get_my_active_driver_booking"
        ).execute()

        active_bookings = active_response.data or []

        active_booking = (
            active_bookings[0]
            if active_bookings
            else None
        )

        # Fetch pending booking requests
        pending_response = (
            client.table("bookings")
            .select("*")
            .eq("status", "pending")
            .order("created_at", desc=True)
            .execute()
        )

        pending_bookings = pending_response.data or []

        # Fetch previously rejected bookings
        rejected_response = (
            client.table("driver_booking_responses")
            .select("booking_id")
            .eq("driver_id", user_id)
            .execute()
        )

        rejected_ids = {
            item["booking_id"]
            for item in (rejected_response.data or [])
        }

        available_bookings = [
            booking
            for booking in pending_bookings
            if booking["id"] not in rejected_ids
        ]

        # Do not offer new bookings while handling an active booking
        if active_booking:
            available_bookings = []

        return {
            "message": "Driver bookings fetched successfully",
            "active_booking": active_booking,
            "count": len(available_bookings),
            "bookings": available_bookings
        }

    except HTTPException:
        raise

    except Exception:
        logger.exception("DRIVER BOOKINGS ERROR")

        raise HTTPException(
            status_code=500,
            detail="Unable to fetch driver bookings"
        )

# =====================================
# ACCEPT BOOKING
# =====================================

@router.patch("/bookings/{booking_id}/accept")
def accept_driver_booking(
    booking_id: UUID,
    current_user=Depends(get_current_user)
):

    client = get_user_supabase(current_user)

    try:
        response = client.rpc(
            "accept_driver_booking",
            {
                "p_booking_id": str(booking_id)
            }
        ).execute()

        return {
            "message": "Booking accepted successfully",
            "result": response.data
        }

    except Exception:
        logger.exception("DRIVER BOOKING ACCEPT ERROR")

        raise HTTPException(
            status_code=409,
            detail="Booking could not be accepted. It may already be assigned or unavailable."
        )


# =====================================
# REJECT BOOKING
# =====================================

@router.patch("/bookings/{booking_id}/reject")
def reject_driver_booking(
    booking_id: UUID,
    current_user=Depends(get_current_user)
):

    client = get_user_supabase(current_user)

    try:
        response = client.rpc(
            "reject_driver_booking",
            {
                "p_booking_id": str(booking_id)
            }
        ).execute()

        return {
            "message": "Booking rejected for this driver",
            "result": response.data
        }

    except Exception:
        logger.exception("DRIVER BOOKING REJECT ERROR")

        raise HTTPException(
            status_code=409,
            detail="Booking could not be rejected. It may no longer be available."
        )


# =====================================
# START BOOKING
# =====================================

@router.patch("/bookings/{booking_id}/start")
def start_driver_booking(
    booking_id: UUID,
    current_user=Depends(get_current_user)
):

    client = get_user_supabase(current_user)

    try:
        response = client.rpc(
            "start_driver_booking",
            {
                "p_booking_id": str(booking_id)
            }
        ).execute()

        return {
            "message": "Booking started successfully",
            "result": response.data
        }

    except Exception:
        logger.exception("START BOOKING ERROR")

        raise HTTPException(
            status_code=409,
            detail="Booking could not be started. Check assignment and booking status."
        )


# =====================================
# COMPLETE BOOKING
# =====================================

@router.patch("/bookings/{booking_id}/complete")
def complete_driver_booking(
    booking_id: UUID,
    current_user=Depends(get_current_user)
):

    client = get_user_supabase(current_user)

    try:
        response = client.rpc(
            "complete_driver_booking",
            {
                "p_booking_id": str(booking_id)
            }
        ).execute()

        return {
            "message": "Booking completed successfully",
            "result": response.data
        }

    except Exception:
        logger.exception("COMPLETE BOOKING ERROR")

        raise HTTPException(
            status_code=409,
            detail="Booking could not be completed. Check assignment and booking status."
        )
        
        
        
# =====================================
# UPDATE DRIVER LIVE LOCATION
# =====================================

@router.put("/location")
def update_driver_location(
    data: DriverLocationRequest,
    current_user=Depends(get_current_user)
):
    client = get_user_supabase(current_user)
    user_id = str(current_user.id)

    try:
        # Verify driver approval and online status
        application = (
            client.table("driver_profiles")
            .select("verification_status, is_online")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )

        if not application.data:
            raise HTTPException(
                status_code=404,
                detail="Driver application not found"
            )

        driver = application.data[0]
        
        logger.info(
            "GPS CHECK: user_id=%s, verification=%s, is_online=%s",
            user_id,
            driver["verification_status"],
            driver["is_online"]
        )
        

        if driver["verification_status"] != "approved":
            raise HTTPException(
                status_code=403,
                detail="Admin approval required"
            )

        if not driver["is_online"]:
            raise HTTPException(
                status_code=403,
                detail="Go online before sharing your location"
            )

        # Save or update current GPS location
        client.table("driver_locations").upsert(
            {
                "driver_id": user_id,
                "latitude": data.latitude,
                "longitude": data.longitude,
                "accuracy_meters": data.accuracy_meters,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            on_conflict="driver_id"
        ).execute()

        return {
            "message": "Driver location updated successfully"
        }

    except HTTPException:
        raise

    except Exception:
        logger.exception("DRIVER LOCATION UPDATE ERROR")

        raise HTTPException(
            status_code=400,
            detail="Unable to update driver location"
        )
        
        

# =====================================
# SECURE BOOKING FARE CALCULATION
# =====================================

@router.post("/bookings/{booking_id}/calculate-fare")
def calculate_driver_booking_fare(
    booking_id: UUID,
    current_user=Depends(get_current_user)
):
    client = get_user_supabase(current_user)
    driver_id = str(current_user.id)

    # Step 1: Get verified route coordinates from Supabase
    try:
        route_result = client.rpc(
            "get_booking_route_for_fare",
            {"p_booking_id": str(booking_id)}
        ).execute()

        route_data = route_result.data

        if not isinstance(route_data, dict):
            raise HTTPException(
                status_code=409,
                detail="Booking route is unavailable"
            )

    except HTTPException:
        raise
    except Exception:
        logger.exception("BOOKING ROUTE FETCH ERROR")
        raise HTTPException(
            status_code=409,
            detail="Unable to verify booking route or driver location"
        )

    # Step 2: Validate GPS accuracy and freshness
    try:
        accuracy = float(route_data["accuracy_meters"])

        location_updated_at = datetime.fromisoformat(
            str(route_data["location_updated_at"]).replace(
                "Z", "+00:00"
            )
        )

        if location_updated_at.tzinfo is None:
            location_updated_at = location_updated_at.replace(
                tzinfo=timezone.utc
            )

        age = datetime.now(timezone.utc) - location_updated_at

        if not math.isfinite(accuracy) or accuracy > 100:
            raise HTTPException(
                status_code=409,
                detail="GPS accuracy must be within 100 metres"
            )

        if age > timedelta(minutes=5) or age < timedelta(minutes=-1):
            raise HTTPException(
                status_code=409,
                detail="Driver GPS location is outdated"
            )

        driver_lat = float(route_data["driver_latitude"])
        driver_lon = float(route_data["driver_longitude"])
        pickup_lat = float(route_data["pickup_latitude"])
        pickup_lon = float(route_data["pickup_longitude"])

        coordinates = [(driver_lat, driver_lon)]

        if not all(
            math.isfinite(value)
            for pair in coordinates
            for value in pair
        ):
            raise ValueError("Invalid driver coordinates")

        if not all(
            math.isfinite(value)
            for value in (pickup_lat, pickup_lon)
        ):
            raise ValueError("Invalid pickup coordinates")

        if not (
            -90 <= driver_lat <= 90
            and -180 <= driver_lon <= 180
            and -90 <= pickup_lat <= 90
            and -180 <= pickup_lon <= 180
        ):
            raise ValueError("Coordinates outside valid range")

    except HTTPException:
        raise
    except Exception:
        logger.exception("GPS VALIDATION ERROR")
        raise HTTPException(
            status_code=409,
            detail="Invalid GPS location data"
        )

    # Step 3: Calculate actual road distance using OSRM
    osrm_url = (
        "https://router.project-osrm.org/route/v1/driving/"
        f"{driver_lon},{driver_lat};{pickup_lon},{pickup_lat}"
    )

    try:
        response = httpx.get(
            osrm_url,
            params={"overview": "false"},
            timeout=15.0
        )
        response.raise_for_status()

        osrm_data = response.json()

        if osrm_data.get("code") != "Ok":
            raise HTTPException(
                status_code=422,
                detail="Road route could not be calculated"
            )

        routes = osrm_data.get("routes", [])

        if not routes:
            raise HTTPException(
                status_code=422,
                detail="No road route found"
            )

        distance_meters = float(routes[0]["distance"])

        if (
            not math.isfinite(distance_meters)
            or distance_meters <= 0
            or distance_meters > 1000000
        ):
            raise HTTPException(
                status_code=422,
                detail="Invalid road distance"
            )

        distance_km = round(distance_meters / 1000, 2)

        if distance_km <= 0:
            raise HTTPException(
                status_code=422,
                detail="Road distance is too small"
            )

    except HTTPException:
        raise
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=503,
            detail="Routing service timed out. Please retry."
        )
    except Exception:
        logger.exception("OSRM ROUTING ERROR")
        raise HTTPException(
            status_code=503,
            detail="Unable to calculate road distance"
        )

    # Step 4: Save fare using privileged backend client
    try:
        admin_client = get_supabase_admin()

        fare_result = admin_client.rpc(
            "save_booking_fare",
            {
                "p_booking_id": str(booking_id),
                "p_distance_km": distance_km,
                "p_driver_id": driver_id
            }
        ).execute()

        return {
            "message": "Booking fare calculated successfully",
            "fare": fare_result.data
        }

    except Exception:
        logger.exception("SECURE FARE SAVE ERROR")
        raise HTTPException(
            status_code=409,
            detail="Fare could not be saved. Please check booking status."
        )
