
import os
import time
import logging
import httpx

from typing import Literal
from security import get_current_user
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, Field
from supabase import create_client

# Load environment variables
load_dotenv()

# Logging configuration
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)


# Supabase client
def get_supabase_client():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")

    if not url or not key:
        logger.error("Supabase environment variables are missing")
        raise HTTPException(
            status_code=500,
            detail="Supabase configuration missing"
        )

    return create_client(url, key)


# Registration request model
class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: Literal["customer", "driver"] = "customer"

# Login request model
class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

# FORGOT PASSWORD REQUEST
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

# RESET PASSWORD REQUEST
class ResetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)


# CUSTOMER REGISTRATION
@router.post("/register")
def register_user(data: RegisterRequest):

    try:
        supabase = get_supabase_client()

        response = supabase.auth.sign_up({
            "email": data.email,
            "password": data.password,
            "options": {
                "data": {
                    "full_name": data.full_name,
                    "role": data.role
                }
            }
        })

        if not response.user:
            raise HTTPException(
                status_code=400,
                detail="Registration failed"
            )

        logger.info(
            "Registration successful for user ID: %s",
            response.user.id
        )

        return {
            "message": "Registration successful",
            "user_id": str(response.user.id)
        }

    except HTTPException:
        raise

    except Exception:
        logger.exception("Registration error")
        raise HTTPException(
            status_code=400,
            detail="Registration failed. Check email or try again later."
        )


# FORGOT PASSWORD
@router.post("/forgot-password")
def forgot_password(data: ForgotPasswordRequest):

    try:
        supabase = get_supabase_client()

        redirect_url = os.getenv(
            "DRIVER_RESET_REDIRECT_URL",
            "http://localhost:8081/reset-password"
        )

        supabase.auth.reset_password_for_email(
            data.email,
            options={"redirect_to": redirect_url}
        )

        return {
            "message": "If the account exists, a password reset link will be sent to the registered email."
        }

    except Exception:
        logger.exception("PASSWORD RESET EMAIL ERROR")

        raise HTTPException(
            status_code=500,
            detail="Unable to send password reset email. Please try again later."
        )

# EMAIL AND PASSWORD LOGIN
@router.post("/login")
def login_user(data: LoginRequest):

    try:
        # Create Supabase client only once
        client_start = time.perf_counter()

        supabase = get_supabase_client()

        logger.info(
            "LOGIN CLIENT CREATION TIME: %.3f seconds",
            time.perf_counter() - client_start
        )

        # Supabase authentication timing
        auth_start = time.perf_counter()

        response = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password
        })
        
        
        logger.info(
            "LOGIN SUPABASE AUTH TIME: %.3f seconds",
            time.perf_counter() - auth_start
        )

        user = response.user
        session = response.session

        if not user or not session:
            raise HTTPException(
                status_code=401,
                detail="Invalid login credentials"
            )
        
        

        # Fetch user profile
        profile_start = time.perf_counter()

        profile_response = (
            supabase.table("profiles")
            .select("id, full_name, phone, role")
            .eq("id", str(user.id))
            .single()
            .execute()
        )

        logger.info(
            "LOGIN PROFILE QUERY TIME: %.3f seconds",
            time.perf_counter() - profile_start
        )

        profile = profile_response.data

        if not profile:
            raise HTTPException(
                status_code=404,
                detail="User profile not found"
            )

        logger.info(
            "Login successful for user ID: %s",
            user.id
        )

        return {
            "message": "Login successful",
            "access_token": session.access_token,
            "refresh_token": session.refresh_token,
            "token_type": "bearer",
            "user": profile
        }

    except HTTPException:
        raise

    except httpx.ConnectTimeout:
        logger.exception("SUPABASE CONNECTION TIMEOUT")

        raise HTTPException(
            status_code=503,
            detail="Supabase server connection timed out. Please retry."
        )

    except Exception:
        logger.exception("LOGIN DEBUG ERROR")

        raise HTTPException(
            status_code=500,
            detail="Login failed due to a server error."
        )


# RESET PASSWORD
@router.post("/reset-password")
def reset_password(
    data: ResetPasswordRequest,
    current_user=Depends(get_current_user)
):
    try:
        access_token = getattr(
            current_user,
            "_gloigo_access_token",
            None
        )

        if not access_token:
            raise HTTPException(
                status_code=401,
                detail="Recovery session is invalid. Request a new reset link."
            )

        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")

        response = httpx.put(
            f"{supabase_url}/auth/v1/user",
            headers={
                "apikey": supabase_key,
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json"
            },
            json={"password": data.new_password},
            timeout=20
        )

        if response.status_code >= 400:
            logger.error(
                "PASSWORD UPDATE FAILED: %s",
                response.status_code
            )
            raise HTTPException(
                status_code=400,
                detail="Password update failed. Request a new reset link."
            )

        return {
            "message": "Password updated successfully. Please sign in again."
        }

    except HTTPException:
        raise

    except Exception:
        logger.exception("PASSWORD UPDATE ERROR")
        raise HTTPException(
            status_code=500,
            detail="Password update failed. Please try again."
        )

# GET CURRENT USER PROFILE
@router.get("/me")
def get_my_profile(
    current_user=Depends(get_current_user)
):

    user_id = str(current_user.id)
    email = current_user.email

    # Auth metadata fallback
    metadata = getattr(current_user, "user_metadata", None) or {}

    full_name = (
        metadata.get("full_name")
        or metadata.get("name")
    )

    phone = None
    role = None

    # Fetch actual profile
    try:
        user_supabase = getattr(
            current_user,
            "_gloigo_supabase",
            None
        )

        if user_supabase:

            profile_start = time.perf_counter()

            profile_response = (
                user_supabase.table("profiles")
                .select("id, full_name, phone, role")
                .eq("id", user_id)
                .single()
                .execute()
            )

            logger.info(
                "ME PROFILE QUERY TIME: %.3f seconds",
                time.perf_counter() - profile_start
            )

            profile = profile_response.data or {}

            full_name = (
                profile.get("full_name")
                or full_name
            )

            phone = profile.get("phone")
            role = profile.get("role")

    except Exception:
        logger.exception(
            "Could not fetch profile for user ID: %s",
            user_id
        )
        
    logger.info(
        "PROFILE RESPONSE SIZE: %s",
        len(str(profile_response.data))
    )

    return {
        "id": user_id,
        "email": email,
        "full_name": full_name,
        "phone": phone,
        "role": role,
        "message": "Profile fetched successfully"
    }
