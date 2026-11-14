
import os

from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")

# Normal key for regular application operations
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Supabase credentials missing in .env")

# Normal Supabase client
supabase = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)


# Privileged client for trusted backend operations only
def get_supabase_admin():

    secret_key = (
        os.getenv("SUPABASE_SECRET_KEY")
        or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    )

    if not secret_key:
        raise ValueError(
            "Supabase server secret key is missing"
        )

    return create_client(
        SUPABASE_URL,
        secret_key
    )


print("Supabase connected successfully!")
