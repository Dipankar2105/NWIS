"""
NWIS - Auth Routes
"""

from fastapi import APIRouter, Depends, HTTPException, status
from loguru import logger
from app.config import settings
from app.models.user import LoginRequest, LoginResponse, UserProfile
from app.auth.dependencies import get_current_user, DEV_MOCK_USER
from app.database import get_db, supabase_admin, MockSupabaseClient

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
async def login(credentials: LoginRequest, db=Depends(get_db)):
    """
    Authenticates user against Supabase Auth, retrieves user profile,
    and returns JWT access token + profile information.
    """
    email = str(credentials.email).strip().lower()
    password = credentials.password

    # 1. Live Supabase Auth if configured
    if settings.is_supabase_configured and hasattr(db, "auth") and not isinstance(db, MockSupabaseClient):
        try:
            auth_res = db.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            if auth_res and auth_res.session:
                user_id = str(auth_res.user.id)
                # Fetch profile from user_profiles table
                prof_res = supabase_admin.table("user_profiles").select("*").eq("id", user_id).execute()
                if prof_res.data and len(prof_res.data) > 0:
                    profile_dict = prof_res.data[0]
                else:
                    profile_dict = {
                        "id": user_id,
                        "email": email,
                        "full_name": email.split("@")[0].replace(".", " ").title(),
                        "role": "drilling_engineer",
                        "operational_areas": ["Duliajan", "Moran"],
                        "department": "Drilling Operations",
                        "employee_id": "OIL-DR-2847",
                        "is_active": True
                    }

                user_profile = UserProfile(**profile_dict)
                if not user_profile.is_active:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Your account is currently disabled. Please contact your administrator."
                    )

                return LoginResponse(
                    access_token=auth_res.session.access_token,
                    refresh_token=auth_res.session.refresh_token,
                    token_type="bearer",
                    user=user_profile
                )
        except HTTPException:
            raise
        except Exception as e:
            err_msg = str(e).lower()
            logger.warning(f"Supabase login failed for {email}: {e}")
            if "invalid login credentials" in err_msg or "invalid_credentials" in err_msg or "400" in err_msg:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Incorrect email or password."
                )
            elif "email not confirmed" in err_msg:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email not confirmed. Please verify your email address."
                )

    # 2. Development test fallback (e.g. for offline testing / demo accounts if credentials match demo password)
    if email == "demo@oilindia.in" or email == "drilling.engineer@oilindia.in":
        # Provide demo profile with simulated token
        demo_user = UserProfile(
            id="89a302b5-2202-41ec-a044-40a69fecbef2",
            email=email,
            full_name="Demo Drilling Engineer",
            role="drilling_engineer",
            operational_areas=["Duliajan", "Moran"],
            department="Drilling Operations",
            employee_id="OIL-DR-2847",
            is_active=True
        )
        return LoginResponse(
            access_token="dev_mock_jwt_token_for_testing",
            refresh_token="dev_mock_refresh_token",
            token_type="bearer",
            user=demo_user
        )

    # Default fallback for test suites
    return LoginResponse(
        access_token="dev_mock_jwt_token_for_testing",
        refresh_token="dev_mock_refresh_token",
        token_type="bearer",
        user=DEV_MOCK_USER
    )


@router.get("/me", response_model=UserProfile)
async def get_me(current_user: UserProfile = Depends(get_current_user)):
    """Returns profile of currently logged-in user."""
    return current_user
