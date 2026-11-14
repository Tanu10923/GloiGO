import logging
from uuid import UUID
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from security import get_current_user


logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/bookings",
    tags=["Bookings"]
)


# =====================================
# BOOKING REQUEST MODEL
# =====================================
class BookingRequest(BaseModel):

    pickup_address: str = Field(
        min_length=5,
        max_length=300
    )

    mobile_number: str = Field(
        min_length=10,
        max_length=10,
        pattern=r"^[6-9]\d{9}$"
    )

    pickup_latitude: float | None = Field(
        default=None,
        ge=-90,
        le=90
    )

    pickup_longitude: float | None = Field(
        default=None,
        ge=-180,
        le=180
    )

    pads_requested: bool = False

    pads_quantity: int = Field(
        default=0,
        ge=0,
        le=20
    )

    hygiene_items: list[str] = Field(
        default_factory=list,
        max_length=10
    )


# =====================================
# GET USER-SPECIFIC SUPABASE CLIENT
# =====================================

def get_user_supabase(current_user: Any):

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
# VERIFY CUSTOMER ROLE
# =====================================

def verify_customer(client):

    try:

        response = client.rpc(
            "is_customer",
            {}
        ).execute()

        is_customer = response.data

        if is_customer is not True:
            raise HTTPException(
                status_code=403,
                detail="Only customers can access this feature"
            )

        return True

    except HTTPException:
        raise

    except Exception:

        logger.exception(
            "CUSTOMER ROLE VERIFICATION ERROR"
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to verify customer role"
        )


# =====================================
# CREATE CUSTOMER BOOKING
# =====================================

@router.post("/")
def create_booking(
    data: BookingRequest,
    current_user: Any = Depends(get_current_user)
):

    # Get authenticated user's database client
    client = get_user_supabase(current_user)

    # Verify customer
    verify_customer(client)

    # Validate sanitary pad quantity
    if data.pads_requested and data.pads_quantity < 1:

        raise HTTPException(
            status_code=400,
            detail="Please select at least one sanitary pad"
        )

    if not data.pads_requested and data.pads_quantity != 0:

        raise HTTPException(
            status_code=400,
            detail="Pad quantity must be zero when pads are not requested"
        )

    # Validate coordinates
    if (
        (data.pickup_latitude is None)
        != (data.pickup_longitude is None)
    ):

        raise HTTPException(
            status_code=400,
            detail="Both latitude and longitude are required together"
        )

    # Prepare booking data
    booking_data = {
        "customer_id": str(current_user.id),
        "van_id": None,
        "pickup_address": data.pickup_address,
        "mobile_number": data.mobile_number,
        "pickup_latitude": data.pickup_latitude,
        "pickup_longitude": data.pickup_longitude,
        "status": "pending",
        "pads_requested": data.pads_requested,
        "pads_quantity": data.pads_quantity,
        "hygiene_items": data.hygiene_items
    }

    try:

        response = (
            client.table("bookings")
            .insert(booking_data)
            .select("*")
            .execute()
        )

        bookings = response.data or []

        if len(bookings) == 0:

            raise HTTPException(
                status_code=500,
                detail="Booking could not be saved"
            )

        logger.info(
            "BOOKING CREATED SUCCESSFULLY | Customer ID: %s",
            current_user.id
        )

        return {
            "message": "Booking request created successfully",
            "booking": bookings[0]
        }

    except HTTPException:
        raise

    except Exception:

        logger.exception(
            "BOOKING CREATION ERROR"
        )

        raise HTTPException(
            status_code=500,
            detail="Could not create booking. Check backend terminal."
        )


# =====================================
# GET CUSTOMER BOOKING HISTORY
# =====================================

@router.get("/my")
def get_my_bookings(
    current_user: Any = Depends(get_current_user)
):

    client = get_user_supabase(current_user)

    verify_customer(client)

    try:

        response = (
            client.table("bookings")
            .select("*")
            .eq(
                "customer_id",
                str(current_user.id)
            )
            .order(
                "created_at",
                desc=True
            )
            .execute()
        )

        bookings = response.data or []

        return {
            "message": "Booking history fetched successfully",
            "count": len(bookings),
            "bookings": bookings
        }

    except Exception:

        logger.exception(
            "BOOKING HISTORY ERROR"
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to fetch booking history"
        )

# =====================================
# CANCEL CUSTOMER BOOKING
# =====================================

@router.patch("/{booking_id}/cancel")
def cancel_booking(
    booking_id: UUID,
    current_user: Any = Depends(get_current_user)
):
    client = get_user_supabase(current_user)

    verify_customer(client)

    try:
        response = client.rpc(
            "cancel_customer_booking",
            {
                "p_booking_id": str(booking_id)
            }
        ).execute()

        return {
            "message": "Booking cancelled successfully",
            "result": response.data
        }

    except Exception:
        logger.exception("BOOKING CANCELLATION ERROR")

        raise HTTPException(
            status_code=409,
            detail="Booking cannot be cancelled. Only your pending bookings can be cancelled."
        )

# =====================================
# GET DRIVER LIVE LOCATION
# =====================================

@router.get("/{booking_id}/driver-location")
def get_booking_driver_location(
    booking_id: UUID,
    current_user: Any = Depends(get_current_user)
):
    client = get_user_supabase(current_user)

    verify_customer(client)

    try:
        response = (
            client.rpc(
                "get_customer_booking_driver_location",
                {"p_booking_id": str(booking_id)}
            )
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=404,
                detail="Driver location is not available yet"
            )

        location = response.data[0]

        return {
            "latitude": location["latitude"],
            "longitude": location["longitude"],
            "updated_at": location["updated_at"]
        }

    except HTTPException:
        raise

    except Exception:
        logger.exception("CUSTOMER DRIVER LOCATION ERROR")

        raise HTTPException(
            status_code=500,
            detail="Unable to fetch driver location"
        )