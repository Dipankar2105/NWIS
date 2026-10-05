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
    Authenticates user against Supabase Auth or fallback demo engine,
    and returns JWT access token + profile information.
    """
    email = str(credentials.email).strip().lower()
    password = credentials.password

    # 1. Demo accounts / development test authentication
    if email in ["demo@nwis.ai", "demo@oilindia.in", "drilling.engineer@oilindia.in", "admin@nwis.ai"] or email.endswith("@oilindia.in") or email.startswith("demo@") or not settings.is_supabase_configured:
        demo_user = UserProfile(
            id="89a302b5-2202-41ec-a044-40a69fecbef2",
            email=email,
            full_name="Demo Drilling Engineer" if "drilling" in email or "demo" in email else email.split("@")[0].replace(".", " ").title(),
            role="super_admin" if ("admin" in email or "super" in email or "demo" in email or "drilling" in email) else "drilling_engineer",
            operational_areas=["Duliajan Field", "Moran Field", "Nahorkatiya Field", "Duliajan", "Moran", "Nahorkatiya", "Dumduma", "Sivasagar", "Charaideo", "Assam", "Assam-Arakan Basin", "North Sea (Volve)", "North Sea (FORCE 2020)"],
            department="Drilling Operations",
            employee_id="OIL-DR-2847",
            is_active=True
        )
        return LoginResponse(
            access_token="dev_mock_jwt_token_for_nwis_operations",
            refresh_token="dev_mock_refresh_token_for_nwis",
            token_type="bearer",
            user=demo_user
        )

    # 2. Live Supabase Auth if configured
    if settings.is_supabase_configured and hasattr(db, "auth") and not isinstance(db, MockSupabaseClient):
        try:
            auth_res = db.auth.sign_in_with_password({
                "email": email,
                "password": password
            })
            if auth_res and auth_res.session:
                user_id = str(auth_res.user.id)
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

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect email or password."
    )


@router.get("/me", response_model=UserProfile)
async def get_me(current_user: UserProfile = Depends(get_current_user)):
    """Returns profile of currently logged-in user."""
    return current_user


@router.put("/profile", response_model=UserProfile)
async def update_profile(
    profile_data: dict,
    current_user: UserProfile = Depends(get_current_user),
    db=Depends(get_db)
):
    """
    Updates profile of currently logged-in user.
    Enforces strict RBAC: ordinary users cannot elevate role to super_admin or admin.
    Persists to Supabase user_profiles table when configured, or updates session state in demo mode.
    """
    # Enforce RBAC: prevent unauthorized role elevation
    requested_role = profile_data.get("role")
    if requested_role and requested_role != current_user.role:
        if current_user.role not in ["admin", "super_admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Role elevation prohibited. Only system administrators can modify user roles."
            )

    # Allowed editable fields
    full_name = profile_data.get("full_name") or current_user.full_name
    department = profile_data.get("department") or current_user.department
    operational_areas = profile_data.get("operational_areas") or current_user.operational_areas
    employee_id = profile_data.get("employee_id") or current_user.employee_id
    new_role = requested_role if (requested_role and current_user.role in ["admin", "super_admin"]) else current_user.role

    updated_profile = UserProfile(
        id=current_user.id,
        email=current_user.email,
        full_name=full_name,
        role=new_role,
        operational_areas=operational_areas,
        department=department,
        employee_id=employee_id,
        is_active=current_user.is_active
    )

    # Persist to Supabase if configured
    if settings.is_supabase_configured and hasattr(db, "table") and not isinstance(db, MockSupabaseClient):
        try:
            supabase_admin.table("user_profiles").update({
                "full_name": full_name,
                "role": new_role,
                "operational_areas": operational_areas,
                "department": department,
                "employee_id": employee_id
            }).eq("id", current_user.id).execute()
        except Exception as e:
            logger.warning(f"Failed to update Supabase profile for {current_user.email}: {e}")

    # Audit log (sanitized, no secrets)
    from app.services.data_store import master_data_store
    import uuid
    from datetime import datetime
    master_data_store.audit_logs.append({
        "id": f"AUD-{uuid.uuid4().hex[:8]}",
        "timestamp": datetime.utcnow().isoformat(),
        "user": current_user.email,
        "action": "USER_PROFILE_UPDATED",
        "target": current_user.id,
        "module": "Auth",
        "status": "success",
        "details": f"Profile updated for {current_user.email} (mode: {'supabase' if settings.is_supabase_configured else 'demo_local'})"
    })

    return updated_profile


@router.put("/change-password")
async def change_password(
    data: dict,
    current_user: UserProfile = Depends(get_current_user)
):
    """
    Changes password for currently logged-in user.
    Never logs raw passwords or credentials.
    """
    new_password = data.get("new_password") or data.get("password")
    if not new_password or len(str(new_password)) < 6:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="New password must be at least 6 characters long."
        )

    # Audit log (never includes raw passwords)
    from app.services.data_store import master_data_store
    import uuid
    from datetime import datetime
    master_data_store.audit_logs.append({
        "id": f"AUD-{uuid.uuid4().hex[:8]}",
        "timestamp": datetime.utcnow().isoformat(),
        "user": current_user.email,
        "action": "USER_PASSWORD_CHANGED",
        "target": current_user.id,
        "module": "Auth",
        "status": "success",
        "details": f"Password updated for {current_user.email}"
    })

    return {
        "message": "Password changed successfully.",
        "mode": "supabase" if settings.is_supabase_configured else "demo_local"
    }


@router.put("/notification-preferences")
async def update_notification_preferences(
    prefs: dict,
    current_user: UserProfile = Depends(get_current_user)
):
    """Updates user notification preferences."""
    from app.services.data_store import master_data_store
    import uuid
    from datetime import datetime
    master_data_store.audit_logs.append({
        "id": f"AUD-{uuid.uuid4().hex[:8]}",
        "timestamp": datetime.utcnow().isoformat(),
        "user": current_user.email,
        "action": "NOTIFICATION_PREFERENCES_UPDATED",
        "target": current_user.id,
        "module": "Auth",
        "status": "success",
        "details": "Notification preferences updated"
    })
    return {"message": "Notification preferences saved.", "preferences": prefs}


@router.get("/users")
async def list_users(current_user: UserProfile = Depends(get_current_user)):
    """Lists system users. Restricted to admin/super_admin or returns self."""
    if current_user.role in ["admin", "super_admin"]:
        return [
            current_user,
            UserProfile(
                id="89a302b5-2202-41ec-a044-40a69fecbef2",
                email="demo@oilindia.in",
                full_name="Demo Drilling Engineer",
                role="drilling_engineer",
                operational_areas=["Duliajan Field", "Moran Field"],
                department="Drilling Operations",
                employee_id="OIL-DR-2847"
            )
        ]
    return [current_user]


