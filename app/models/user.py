from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from datetime import datetime


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)


class TokenPayload(BaseModel):
    sub: str
    email: str
    role: str


class UserProfile(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: str
    operational_areas: List[str] = []
    department: Optional[str] = None
    employee_id: Optional[str] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserProfile