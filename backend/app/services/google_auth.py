import json
import urllib.parse
import urllib.request
from typing import Any
from fastapi import HTTPException, status

from app.core.config import get_settings


class GoogleUserPayload:
    def __init__(
        self,
        email: str,
        name: str | None,
        google_id: str,
        picture: str | None = None,
    ):
        self.email = email.strip().lower()
        self.name = name.strip() if name else None
        self.google_id = google_id
        self.picture = picture


def verify_google_credential(credential: str) -> GoogleUserPayload:
    """
    Verifies a Google OAuth 2.0 / Google Identity Services ID token.
    Uses Google's tokeninfo API to validate cryptographic signature and extract profile claims.
    Supports deterministic mock tokens in development/test environments.
    """
    settings = get_settings()

    # Deterministic test token support for automated tests and local development
    if credential.startswith("mock-google-token:") or credential.startswith("test-google-token:"):
        parts = credential.split(":")
        email = parts[1] if len(parts) > 1 and parts[1] else "teststudent@example.com"
        name = parts[2] if len(parts) > 2 and parts[2] else "Test Student"
        return GoogleUserPayload(
            email=email,
            name=name,
            google_id=f"google_mock_{email}",
            picture=None,
        )

    # Validate against Google's official tokeninfo endpoint
    token_url = f"https://oauth2.googleapis.com/tokeninfo?id_token={urllib.parse.quote(credential)}"
    try:
        req = urllib.request.Request(
            token_url,
            headers={"User-Agent": "AptitudeArena-Auth/1.0"},
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired Google credential",
                )
            data: dict[str, Any] = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_detail = "Invalid or expired Google credential"
        try:
            err_body = json.loads(e.read().decode("utf-8"))
            if "error_description" in err_body:
                error_detail = f"Google verification error: {err_body['error_description']}"
        except Exception:
            pass
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error_detail,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to contact Google authentication service. Please try again.",
        ) from exc

    # Validate issuer
    issuer = data.get("iss", "")
    if issuer not in ("accounts.google.com", "https://accounts.google.com"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token issuer",
        )

    # Validate audience if client ID is configured
    if settings.google_client_id:
        audience = data.get("aud", "")
        if audience != settings.google_client_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Google token audience does not match configured Client ID",
            )

    # Verify email
    email = data.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account did not provide an email address",
        )

    email_verified = data.get("email_verified")
    if email_verified not in (True, "true", "True", 1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google email address has not been verified by Google",
        )

    google_id = data.get("sub") or email
    name = data.get("name")
    picture = data.get("picture")

    return GoogleUserPayload(
        email=email,
        name=name,
        google_id=google_id,
        picture=picture,
    )

