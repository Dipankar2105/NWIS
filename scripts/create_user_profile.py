import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment or .env file.")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

try:
    print("Listing auth users to find target user...")
    auth_users = supabase.auth.admin.list_users()
    target_email = os.getenv("DEMO_USER_EMAIL", "demo@oilindia.in")
    target_user = None

    users_list = getattr(auth_users, "users", auth_users if isinstance(auth_users, list) else [])
    for user in users_list:
        if getattr(user, "email", None) == target_email:
            target_user = user
            break

    if target_user:
        print(f"Found auth user: {target_user.id} - {target_user.email}")
        profile_data = {
            "id": target_user.id,
            "email": target_user.email,
            "full_name": os.getenv("DEMO_USER_NAME", "Demo Drilling Engineer"),
            "role": "drilling_engineer",
            "operational_areas": ["Duliajan", "Moran"],
            "department": "Drilling Operations",
            "employee_id": "OIL-DR-2847",
        }

        result = supabase.table("user_profiles").upsert(profile_data).execute()
        print(f"Upsert result: {result.data}")

        # Verify
        verify = supabase.table("user_profiles").select("*").eq("email", target_email).execute()
        print(f"Verification: {verify.data}")
    else:
        print(f"User {target_email} not found in auth.users.")
except Exception as e:
    print(f"Error: {e}")
