import uuid
from collections.abc import Generator
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import (
    create_password_reset_token,
    decode_password_reset_token,
    get_password_fingerprint,
    hash_password,
    verify_password,
)
from app.db.session import Base, get_db
from app.main import app
from app.models.enums import UserRole
from app.models.user import User


@pytest.fixture
def auth_client() -> Generator[tuple[TestClient, User], None, None]:
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    testing_session = sessionmaker(bind=engine, autocommit=False, autoflush=False)

    def override_db() -> Generator[Session, None, None]:
        db = testing_session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as test_client:
        with testing_session() as db:
            student = User(
                id=uuid.uuid4(),
                email="reset_student@aptitudearena.com",
                password_hash=hash_password("OldPassword123!"),
                full_name="Reset Student",
                role=UserRole.USER,
                is_active=True,
            )
            db.add(student)
            db.commit()
            db.refresh(student)
        yield test_client, student
    app.dependency_overrides.clear()


def test_token_creation_and_single_use(auth_client: tuple[TestClient, User]):
    client, student = auth_client
    initial_hash = student.password_hash

    # Create token
    token = create_password_reset_token(student.id, initial_hash, expires_minutes=30)
    user_id, token_fp = decode_password_reset_token(token)
    assert user_id == student.id
    assert token_fp == get_password_fingerprint(initial_hash)

    # Reset password via endpoint
    res = client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "NewSecretPassword456!"},
    )
    assert res.status_code == 200
    assert "successfully updated" in res.json()["message"]

    # Try reusing the exact same token -> MUST FAIL
    res_reuse = client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "AnotherPassword789!"},
    )
    assert res_reuse.status_code == 400
    assert "already been used or expired" in res_reuse.json()["detail"]


def test_forgot_password_flow(auth_client: tuple[TestClient, User]):
    client, student = auth_client

    # Request reset for valid email
    res = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": student.email},
    )
    assert res.status_code == 200
    assert "reset link has been sent" in res.json()["message"]

    # Request reset for non-existent email -> should still return success message (prevent email enumeration)
    res_unknown = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "nonexistent_user@example.com"},
    )
    assert res_unknown.status_code == 200
    assert "reset link has been sent" in res_unknown.json()["message"]


def test_invalid_reset_token_fails(auth_client: tuple[TestClient, User]):
    client, student = auth_client

    res = client.post(
        "/api/v1/auth/reset-password",
        json={"token": "invalid.tampered.token1234567890", "new_password": "NewSecretPassword456!"},
    )
    assert res.status_code == 400

