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
