from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import UserRole


class RegisterRequest(BaseModel):
    email: str = Field(min_length=5, max_length=320)
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=120)
    guest_attempt_id: UUID | None = None
    guest_token: str | None = Field(default=None, min_length=20)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        email = value.strip().lower()
        if "@" not in email:
            raise ValueError("Enter a valid email address")
        return email


class LoginRequest(BaseModel):
    email: str
    password: str
    guest_attempt_id: UUID | None = None
    guest_token: str | None = Field(default=None, min_length=20)


class GoogleAuthRequest(BaseModel):
    credential: str = Field(min_length=10, description="Google ID Token / JWT credential")
    guest_attempt_id: UUID | None = None
    guest_token: str | None = Field(default=None, min_length=20)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    email: str
    full_name: str | None
    role: UserRole
    free_test_consumed: bool
    is_subscribed: bool = False
    created_at: datetime


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


class ForgotPasswordRequest(BaseModel):
    email: str = Field(min_length=5, max_length=320)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        email = value.strip().lower()
        if "@" not in email:
            raise ValueError("Enter a valid email address")
        return email


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=20, description="Password reset JWT token")
    new_password: str = Field(min_length=8, max_length=128)


class MessageResponse(BaseModel):
    message: str
    success: bool = True
