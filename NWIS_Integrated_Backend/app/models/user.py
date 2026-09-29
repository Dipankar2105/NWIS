"""
NWIS - User and Authentication Models
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)


class UserProfile(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: str = "viewer"
    operational_areas: List[str] = Field(default_factory=list)
    department: Optional[str] = None
    employee_id: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    user: UserProfile


class TokenPayload(BaseModel):
    sub: str
    email: Optional[str] = None
    role: str = "viewer"
    operational_areas: List[str] = Field(default_factory=list)
