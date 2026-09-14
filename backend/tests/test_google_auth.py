from uuid import uuid4
import pytest
from fastapi.testclient import TestClient

from app.db.session import SessionLocal
from app.main import app
from app.models.attempt import TestAttempt as AttemptModel
from app.models.enums import AttemptStatus, TestStatus as StatusEnum
from app.models.test import Test as TestModel
from app.services.test_engine import hash_guest_token

client = TestClient(app)


def test_google_auth_new_user() -> None:
    email = f"newgoogle_{uuid4().hex[:8]}@example.com"
    res = client.post(
        "/api/v1/auth/google",
        json={"credential": f"test-google-token:{email}:Google Student"},
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == email
    assert data["user"]["full_name"] == "Google Student"
    assert data["user"]["role"] == "USER"


def test_google_auth_existing_user() -> None:
    email = f"existinggoogle_{uuid4().hex[:8]}@example.com"
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Password123!",
            "full_name": "Original Name",
        },
    )
    assert reg.status_code == 201

    # Now sign in via Google with same email
    res = client.post(
        "/api/v1/auth/google",
        json={"credential": f"test-google-token:{email}:Original Name"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["email"] == email
    assert data["user"]["full_name"] == "Original Name"


def test_google_auth_guest_attempt_linkage() -> None:
    db = SessionLocal()
    try:
        # Create published test
        test_obj = TestModel(
            name=f"Diagnostic Google Test {uuid4().hex[:6]}",
            duration_seconds=900,
            question_count=20,
            status=StatusEnum.PUBLISHED,
        )
        db.add(test_obj)
        db.commit()

        from datetime import datetime, timezone, timedelta
        now = datetime.now(timezone.utc)
        # Create guest attempt
        guest_token = f"valid_guest_token_{uuid4().hex[:12]}"
        attempt = AttemptModel(
            test_id=test_obj.id,
            user_id=None,
            guest_token_hash=hash_guest_token(guest_token),
            status=AttemptStatus.SUBMITTED,
            started_at=now,
            expires_at=now + timedelta(minutes=15),
            total_questions=20,
            score=16,
        )
        db.add(attempt)
        db.commit()
        db.refresh(attempt)
        attempt_id_str = str(attempt.id)
    finally:
        db.close()

    # Sign in with Google and pass guest attempt id and token
    email = f"linkedstudent_{uuid4().hex[:8]}@example.com"
    res = client.post(
        "/api/v1/auth/google",
        json={
            "credential": f"test-google-token:{email}:Linked Student",
            "guest_attempt_id": attempt_id_str,
            "guest_token": guest_token,
        },
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["user"]["free_test_consumed"] is True

    # Verify attempt in DB is linked
    db = SessionLocal()
    try:
        updated_attempt = db.get(AttemptModel, attempt.id)
        assert updated_attempt.user_id is not None
    finally:
        db.close()


def test_google_auth_invalid_credential() -> None:
    res = client.post(
        "/api/v1/auth/google",
        json={"credential": "invalid_fake_jwt_token_that_does_not_exist"},
    )
    assert res.status_code in (401, 503)
