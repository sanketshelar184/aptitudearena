import hashlib
from datetime import UTC, datetime, timedelta
from uuid import UUID

import jwt
from pwdlib import PasswordHash

from app.core.config import get_settings

password_hash = PasswordHash.recommended()
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed: str | None) -> bool:
    return bool(hashed) and password_hash.verify(password, hashed)


def create_access_token(user_id: UUID) -> str:
    settings = get_settings()
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": str(user_id), "exp": expires_at}, settings.secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str) -> UUID:
    try:
        subject = jwt.decode(token, get_settings().secret_key, algorithms=[ALGORITHM]).get("sub")
        return UUID(subject)
    except (jwt.InvalidTokenError, TypeError, ValueError) as error:
        raise ValueError("Invalid or expired session") from error


def get_password_fingerprint(current_password_hash: str | None) -> str:
    return hashlib.sha256((current_password_hash or "empty").encode()).hexdigest()[:16]


def create_password_reset_token(user_id: UUID, current_password_hash: str | None, expires_minutes: int = 30) -> str:
    settings = get_settings()
    expires_at = datetime.now(UTC) + timedelta(minutes=expires_minutes)
    fp = get_password_fingerprint(current_password_hash)
    payload = {
        "sub": str(user_id),
        "purpose": "password_reset",
        "fp": fp,
        "exp": expires_at,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_password_reset_token(token: str) -> tuple[UUID, str]:
    """Decodes reset token and returns (user_id, fingerprint). Raises ValueError on failure."""
    try:
        payload = jwt.decode(token, get_settings().secret_key, algorithms=[ALGORITHM])
        if payload.get("purpose") != "password_reset":
            raise ValueError("Token is not valid for password reset")
        user_id = UUID(payload.get("sub"))
        fp = payload.get("fp", "")
        return user_id, fp
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, TypeError, ValueError) as error:
        raise ValueError("Invalid or expired password reset link") from error

