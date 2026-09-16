from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user
from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    create_password_reset_token,
    decode_password_reset_token,
    get_password_fingerprint,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.attempt import TestAttempt
from app.models.commerce import Subscription
from app.models.enums import SubscriptionStatus, UserRole
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    ForgotPasswordRequest,
    GoogleAuthRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    ResetPasswordRequest,
    UserRead,
)
from app.services.email import send_password_reset_email
from app.services.google_auth import verify_google_credential
from app.services.test_engine import hash_guest_token

router = APIRouter(prefix="/auth", tags=["auth"])


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def user_to_read(db: Session, user: User) -> UserRead:
    now = utc_now()
    active_sub = db.scalar(
        select(Subscription).where(
            Subscription.user_id == user.id,
            Subscription.status == SubscriptionStatus.ACTIVE,
            (Subscription.end_date.is_(None) | (Subscription.end_date > now)),
        )
    )
    data = UserRead.model_validate(user)
    data.is_subscribed = bool(active_sub)
    return data


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> AuthResponse:
    if db.scalar(select(User).where(User.email == payload.email)):
        raise HTTPException(status_code=409, detail="An account already exists for this email")

    settings = get_settings()
    is_initial_admin = bool(settings.initial_admin_email and payload.email == settings.initial_admin_email.lower())
    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        role=UserRole.ADMIN if is_initial_admin else UserRole.USER,
    )
    db.add(user)
    db.flush()

    if payload.guest_attempt_id and payload.guest_token:
        attempt = db.get(TestAttempt, payload.guest_attempt_id)
        if attempt and attempt.guest_token_hash == hash_guest_token(payload.guest_token):
            attempt.user_id = user.id
            user.free_test_consumed = True

    db.commit()
    db.refresh(user)
    return AuthResponse(access_token=create_access_token(user.id), user=user_to_read(db, user))


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user = db.scalar(select(User).where(User.email == payload.email.strip().lower()))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if payload.guest_attempt_id and payload.guest_token:
        attempt = db.get(TestAttempt, payload.guest_attempt_id)
        if attempt and attempt.guest_token_hash == hash_guest_token(payload.guest_token):
            attempt.user_id = user.id
            user.free_test_consumed = True
            db.commit()

    return AuthResponse(access_token=create_access_token(user.id), user=user_to_read(db, user))


@router.post("/google", response_model=AuthResponse)
def google_auth(payload: GoogleAuthRequest, db: Session = Depends(get_db)) -> AuthResponse:
    google_user = verify_google_credential(payload.credential)

    user = db.scalar(select(User).where(User.email == google_user.email))
    settings = get_settings()

    if not user:
        is_initial_admin = bool(
            settings.initial_admin_email
            and google_user.email == settings.initial_admin_email.lower()
        )
        user = User(
            email=google_user.email,
            password_hash=None,
            full_name=google_user.name,
            role=UserRole.ADMIN if is_initial_admin else UserRole.USER,
        )
        db.add(user)
        db.flush()
    else:
        # Update name if previously missing
        if not user.full_name and google_user.name:
            user.full_name = google_user.name
        if settings.initial_admin_email and user.email == settings.initial_admin_email.lower():
            user.role = UserRole.ADMIN

    # Link guest attempt if provided
    if payload.guest_attempt_id and payload.guest_token:
        attempt = db.get(TestAttempt, payload.guest_attempt_id)
        if attempt and attempt.guest_token_hash == hash_guest_token(payload.guest_token):
            attempt.user_id = user.id
            user.free_test_consumed = True

    db.commit()
    db.refresh(user)
    return AuthResponse(access_token=create_access_token(user.id), user=user_to_read(db, user))


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout() -> None:
    return None


@router.get("/me", response_model=UserRead)
def me(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> UserRead:
    return user_to_read(db, user)


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)) -> MessageResponse:
    user = db.scalar(select(User).where(User.email == payload.email.strip().lower()))
    if user and user.is_active:
        reset_token = create_password_reset_token(user.id, user.password_hash)
        send_password_reset_email(user.email, user.full_name, reset_token)

    return MessageResponse(
        message="If an account exists with this email address, a password reset link has been sent. Please check your inbox."
    )


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)) -> MessageResponse:
    try:
        user_id, token_fp = decode_password_reset_token(payload.token)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found or deactivated.")

    # Check that password hasn't changed since token was issued
    current_fp = get_password_fingerprint(user.password_hash)
    if token_fp != current_fp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password reset link has already been used or expired. Please request a new one.",
        )

    # Update password
    user.password_hash = hash_password(payload.new_password)
    db.commit()

    return MessageResponse(
        message="Your password has been successfully updated. You can now sign in with your new password."
    )
