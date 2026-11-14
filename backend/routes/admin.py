import logging
logger = logging.getLogger(__name__)
from typing import Literal
from uuid import UUID
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from security import get_current_user



router = APIRouter(
    prefix="/admin",
    tags=["Admin Management"]
)


# Get authenticated user's Supabase client
def get_user_supabase(current_user):

    user_supabase = getattr(
        current_user,
        "_gloigo_supabase",
        None
    )

    if user_supabase is None:
        raise HTTPException(
            status_code=500,
            detail="User database connection unavailable"
        )

    return user_supabase


# Verify admin role using protected database function
def verify_admin(supabase):

    try:
        response = supabase.rpc(
            "is_admin", {}
        ).execute()

        if response.data is not True:
            raise HTTPException(
                status_code=403,
                detail="Admin access required"
            )

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to verify admin permissions"
        )


# Review request model
class DriverReviewRequest(BaseModel):

    action: Literal["approve", "reject"]

    reason: str | None = Field(
        default=None,
        max_length=500
    )


# GET ALL PENDING DRIVER APPLICATIONS
@router.get("/drivers/pending")
def get_pending_drivers(
    current_user=Depends(get_current_user)
):

    supabase = get_user_supabase(current_user)

    verify_admin(supabase)

    try:

        response = (
            supabase.table("driver_profiles")
            .select(
                "user_id, license_number, "
                "license_document_path, "
                "verification_status, "
                "rejection_reason, created_at"
            )
            .eq("verification_status", "pending")
            .order("created_at", desc=True)
            .execute()
        )

        applications = response.data or []

        if not applications:
            return {
                "message": "No pending driver applications",
                "count": 0,
                "applications": []
            }

        # Fetch corresponding driver profiles
        user_ids = [
            application["user_id"]
            for application in applications
        ]

        profiles_response = (
            supabase.table("profiles")
            .select("id, full_name, phone")
            .in_("id", user_ids)
            .execute()
        )

        profiles = profiles_response.data or []

        profile_map = {
            profile["id"]: profile
            for profile in profiles
        }

        result = []

        for application in applications:

            driver = dict(application)

            driver["profile"] = profile_map.get(
                application["user_id"]
            )

            result.append(driver)

        return {
            "message": "Pending applications fetched successfully",
            "count": len(result),
            "applications": result
        }

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch driver applications. Check backend terminal."
        )


# GET ALL APPROVED DRIVERS
@router.get("/drivers/approved")
def get_approved_drivers(
    current_user=Depends(get_current_user)
):
    supabase = get_user_supabase(current_user)
    verify_admin(supabase)

    try:
        response = (
            supabase.table("driver_profiles")
            .select("user_id, license_number, is_online, verification_status")
            .eq("verification_status", "approved")
            .order("created_at", desc=True)
            .execute()
        )

        drivers = response.data or []

        if not drivers:
            return {
                "message": "No approved drivers found",
                "count": 0,
                "drivers": []
            }

        user_ids = [driver["user_id"] for driver in drivers]

        profiles_response = (
            supabase.table("profiles")
            .select("id, full_name, phone")
            .in_("id", user_ids)
            .execute()
        )

        profiles = profiles_response.data or []
        profile_map = {
            profile["id"]: profile
            for profile in profiles
        }

        for driver in drivers:
            driver["profile"] = profile_map.get(driver["user_id"])

        return {
            "message": "Approved drivers fetched successfully",
            "count": len(drivers),
            "drivers": drivers
        }

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch approved drivers."
        )



# APPROVE OR REJECT DRIVER APPLICATION
@router.patch("/drivers/{user_id}/review")
def review_driver_application(
    user_id: UUID,
    data: DriverReviewRequest,
    current_user=Depends(get_current_user)
):

    supabase = get_user_supabase(current_user)

    verify_admin(supabase)

    if data.action == "reject":
        if not data.reason or not data.reason.strip():
            raise HTTPException(
                status_code=422,
                detail="Rejection reason is required"
            )

    try:

        response = supabase.rpc(
            "review_driver_application",
            {
                "p_user_id": str(user_id),
                "p_action": data.action,
                "p_reason": (
                    data.reason.strip()
                    if data.reason
                    else None
                )
            }
        ).execute()

        return {
            "message": (
                "Driver application approved successfully"
                if data.action == "approve"
                else "Driver application rejected successfully"
            ),
            "result": response.data
        }

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Unable to review driver application. Check backend terminal."
        )

# =====================================
# GET ALL BOOKINGS (ADMIN)
# =====================================

@router.get("/bookings/all")
def get_all_bookings(
    current_user=Depends(get_current_user)
):
    supabase = get_user_supabase(current_user)

    verify_admin(supabase)

    try:
        response = (
            supabase.table("bookings")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )

        bookings = response.data or []

        return {
            "message": "All bookings fetched successfully",
            "count": len(bookings),
            "bookings": bookings
        }

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch bookings. Check backend terminal."
        )
        
        
# =====================================
# GET ALL VANS (ADMIN)
# =====================================

@router.get("/vans")
def get_all_vans(
    current_user=Depends(get_current_user)
):
    supabase = get_user_supabase(current_user)

    verify_admin(supabase)

    try:
        response = (
            supabase.table("vans")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )

        vans = response.data or []

        return {
            "message": "All vans fetched successfully",
            "count": len(vans),
            "vans": vans
        }

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch vans. Check backend terminal."
        )
  
class AddVanRequest(BaseModel):
    van_number: str = Field(min_length=2, max_length=50)
    driver_id: UUID | None = None


class UpdateVanRequest(BaseModel):
    van_number: str | None = Field(default=None, min_length=2, max_length=50)
    driver_id: UUID | None = None
    status: Literal["available", "maintenance", "inactive"] | None = None


def verify_approved_driver(supabase, driver_id):
    response = (
        supabase.table("driver_profiles")
        .select("user_id, verification_status")
        .eq("user_id", str(driver_id))
        .eq("verification_status", "approved")
        .execute()
    )

    if not response.data:
        raise HTTPException(
            status_code=400,
            detail="Driver not found or not approved"
        )


# 1. ADD NEW VAN
@router.post("/vans")
def add_van(data: AddVanRequest, current_user=Depends(get_current_user)):
    supabase = get_user_supabase(current_user)
    verify_admin(supabase)

    try:
        if data.driver_id:
            verify_approved_driver(supabase, data.driver_id)

        van_data = {
            "van_number": data.van_number,
            "driver_id": str(data.driver_id) if data.driver_id else None,
            "status": "available"
        }

        response = (
            supabase.table("vans")
            .insert(van_data)
            .execute()
        )

        return {
            "message": "Van added successfully",
            "van": response.data[0] if response.data else None
        }

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Unable to add van. Check backend terminal."
        )


# 2. UPDATE VAN
@router.patch("/vans/{van_id}")
def update_van(
    van_id: UUID,
    data: UpdateVanRequest,
    current_user=Depends(get_current_user)
):
    supabase = get_user_supabase(current_user)
    verify_admin(supabase)

    update_data = data.dict(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="At least one field is required"
        )

    try:
        if "driver_id" in update_data and update_data["driver_id"] is not None:
            verify_approved_driver(supabase, update_data["driver_id"])

        if "driver_id" in update_data and update_data["driver_id"] is not None:
            update_data["driver_id"] = str(update_data["driver_id"])

        response = (
            supabase.table("vans")
            .update(update_data)
            .eq("id", str(van_id))
            .execute()
        )

        if not response.data:
            raise HTTPException(status_code=404, detail="Van not found")

        return {
            "message": "Van updated successfully",
            "van": response.data[0]
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("UPDATE VAN ERROR")
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )      
        
        
@router.patch("/bookings/{booking_id}/cancel")
def admin_cancel_booking(
    booking_id: UUID,
    current_user=Depends(get_current_user)
):
    supabase = get_user_supabase(current_user)
    verify_admin(supabase)

    try:
        response = supabase.rpc(
            "admin_cancel_booking",
            {"p_booking_id": str(booking_id)}
        ).execute()

        return {
            "message": "Booking cancelled successfully",
            "result": response.data
        }

    except Exception:
        logger.exception("ADMIN CANCEL BOOKING ERROR")
        raise HTTPException(
            status_code=400,
            detail="Unable to cancel booking. Check backend terminal."
        )
    
def get_table_count(supabase, table, filters=None, count_column="id"):
    query = supabase.table(table).select(
        count_column,
        count="exact",
        head=True
    )

    if filters:
        for column, value in filters.items():
            query = query.eq(column, value)

    response = query.execute()
    return response.count or 0


@router.get("/dashboard/stats")
def get_admin_dashboard_stats(
    current_user=Depends(get_current_user)
):
    supabase = get_user_supabase(current_user)
    verify_admin(supabase)

    try:
        stats = {
            "customers": {
                "total": get_table_count(
                    supabase, "profiles",
                    {"role": "customer"}
                )
            },

            "drivers": {
                "total": get_table_count(
                    supabase, "driver_profiles",
                    count_column="user_id"
                ),

                "approved": get_table_count(
                    supabase, "driver_profiles",
                    {"verification_status": "approved"},
                    count_column="user_id"
                ),

                "pending": get_table_count(
                    supabase, "driver_profiles",
                    {"verification_status": "pending"},
                    count_column="user_id"
                ),

                "online": get_table_count(
                    supabase, "driver_profiles",
                    {"is_online": True},
                    count_column="user_id"
                )
            },

            "vans": {
                "total": get_table_count(supabase, "vans"),
                "available": get_table_count(
                    supabase, "vans",
                    {"status": "available"}
                ),
                "maintenance": get_table_count(
                    supabase, "vans",
                    {"status": "maintenance"}
                ),
                "inactive": get_table_count(
                    supabase, "vans",
                    {"status": "inactive"}
                )
            },

            "bookings": {
                "total": get_table_count(supabase, "bookings"),
                "pending": get_table_count(
                    supabase, "bookings",
                    {"status": "pending"}
                ),
                "accepted": get_table_count(
                    supabase, "bookings",
                    {"status": "accepted"}
                ),
                "arriving": get_table_count(
                    supabase, "bookings",
                    {"status": "arriving"}
                ),
                "in_progress": get_table_count(
                    supabase, "bookings",
                    {"status": "in_progress"}
                ),
                "completed": get_table_count(
                    supabase, "bookings",
                    {"status": "completed"}
                ),
                "cancelled": get_table_count(
                    supabase, "bookings",
                    {"status": "cancelled"}
                )
            }
        }

        return {
            "message": "Dashboard statistics fetched successfully",
            "stats": stats
        }

    except Exception:
        logger.exception("ADMIN DASHBOARD STATS ERROR")
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch dashboard statistics. Check backend terminal."
        )