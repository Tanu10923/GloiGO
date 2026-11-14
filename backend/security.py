
import os
import logging
import time

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)
from supabase import create_client

load_dotenv()

logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer(auto_error=True)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
):
    total_start = time.perf_counter()
    token = credentials.credentials

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")

    if not supabase_url or not supabase_key:
        logger.error("Supabase configuration missing")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server configuration error"
        )

    try:
        client_start = time.perf_counter()

        # Create one client for this request
        user_client = create_client(
            supabase_url,
            supabase_key
        )

        logger.info(
            "SUPABASE CLIENT CREATION TIME: %.3f seconds",
            time.perf_counter() - client_start
        )

        # Verify the actual access token with Supabase Auth
        verify_start = time.perf_counter()

        response = user_client.auth.get_user(token)

        logger.info(
            "TOKEN VERIFICATION TIME: %.3f seconds",
            time.perf_counter() - verify_start
        )

        user = response.user

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired access token"
            )

        # Configure this request's client for the verified user
        user_client.postgrest.auth(token)

        user._gloigo_supabase = user_client
        user._gloigo_access_token = token

        logger.info(
            "AUTHENTICATION TOTAL TIME: %.3f seconds",
            time.perf_counter() - total_start
        )

        return user

    except HTTPException:
        raise

    except Exception:
        logger.exception("Authentication verification failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )
