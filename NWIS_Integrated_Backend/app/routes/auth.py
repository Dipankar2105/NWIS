"""
NWIS - Auth Routes
"""

from fastapi import APIRouter, Depends, HTTPException, status
from app.models.user import LoginRequest, LoginResponse, UserProfile
from app.auth.dependencies import get_current_user, DEV_MOCK_USER
from app.database import get_db

router = APIRouter()


@router.post("/login", response_model=LoginResponse)
async def login(credentials: LoginRequest, db=Depends(get_db)):
    """Logs in user or provides dev mock token when unconfigured."""
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
