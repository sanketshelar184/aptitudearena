from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.security import create_access_token
from app.db.session import SessionLocal
from app.main import app
from app.models.enums import UserRole
from app.models.user import User

client = TestClient(app)


def get_admin_headers() -> dict[str, str]:
    db = SessionLocal()
    try:
        admin = db.scalar(select(User).where(User.role == UserRole.ADMIN))
        if not admin:
            admin = User(
                email=f"admin_{uuid4().hex[:8]}@aptitudearena.com",
                full_name="System Admin",
                role=UserRole.ADMIN,
                is_active=True,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
        token = create_access_token(admin.id)
        return {"Authorization": f"Bearer {token}"}
    finally:
        db.close()


def test_student_registration_and_login():
    email = f"student_{uuid4().hex[:8]}@example.com"
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password123!", "full_name": "Rohan Sharma"},
    )
    assert reg.status_code == 201
    reg_data = reg.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == email
    assert reg_data["user"]["full_name"] == "Rohan Sharma"
    assert reg_data["user"]["role"] == "USER"
    assert reg_data["user"]["is_subscribed"] is False

    # Login
    login_res = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Password123!"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]

    # Current user check
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == email


def test_guest_attempt_migration_on_register():
    # Take a free test as guest
    start_res = client.post("/api/v1/tests/free/start")
    assert start_res.status_code == 201
    started = start_res.json()
    attempt_id = started["attempt_id"]
    guest_token = started["guest_token"]

    # Register providing the guest attempt ID and token
    email = f"new_student_{uuid4().hex[:8]}@example.com"
    reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "SecurePassword123!",
            "full_name": "Priya Patel",
            "guest_attempt_id": attempt_id,
            "guest_token": guest_token,
        },
    )
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    assert reg.json()["user"]["free_test_consumed"] is True

    # Verify attempt appears in user's practice history
    attempts_res = client.get("/api/v1/users/me/attempts", headers={"Authorization": f"Bearer {token}"})
    assert attempts_res.status_code == 200
    user_attempts = attempts_res.json()
    assert any(a["id"] == attempt_id for a in user_attempts)


def test_user_cannot_access_admin_endpoints():
    email = f"standard_{uuid4().hex[:8]}@example.com"
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "StandardUser123!"},
    )
    token = reg.json()["access_token"]

    # Attempt admin call
    res = client.get("/api/v1/admin/products", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403


def test_product_catalog_and_admin_management():
    # Public list
    prods = client.get("/api/v1/products").json()
    assert len(prods) >= 2
    # Verify prices are returned in INR and paise
    test_prod = next(p for p in prods if p["product_type"] == "TEST")
    assert test_prod["price_inr"] > 0
    assert test_prod["price_paise"] == test_prod["price_inr"] * 100

    # Admin updates product price
    headers = get_admin_headers()
    updated = client.put(
        f"/api/v1/admin/products/{test_prod['id']}",
        json={"price_paise": 1500},  # Change to ₹15
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["price_paise"] == 1500
    assert updated.json()["price_inr"] == 15

    # Revert back to original price for consistency
    client.put(
        f"/api/v1/admin/products/{test_prod['id']}",
        json={"price_paise": 1000},
        headers=headers,
    )


def test_order_creation_and_signature_verification():
    # Register user
    email = f"buyer_{uuid4().hex[:8]}@example.com"
    token = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password123!"},
    ).json()["access_token"]
    auth_h = {"Authorization": f"Bearer {token}"}

    # Find ₹10 test product
    prods = client.get("/api/v1/products").json()
    test_prod = next(p for p in prods if p["product_type"] == "TEST")

    # Create Order
    order_res = client.post(
        "/api/v1/payments/create-order",
        json={"product_id": test_prod["id"]},
        headers=auth_h,
    )
    assert order_res.status_code == 201
    order_data = order_res.json()
    assert order_data["amount_inr"] == test_prod["price_inr"]
    order_id = order_data["order_id"]

    # Verify with failed signature
    fail_verify = client.post(
        "/api/v1/payments/verify",
        json={
            "order_id": order_id,
            "payment_id": f"pay_fail_{uuid4().hex[:10]}",
            "signature": "mock_fail_tampered_signature",
        },
        headers=auth_h,
    )
    assert fail_verify.status_code == 400

    # Verify with successful signature
    pay_id = f"pay_succ_{uuid4().hex[:10]}"
    success_verify = client.post(
        "/api/v1/payments/verify",
        json={
            "order_id": order_id,
            "payment_id": pay_id,
            "signature": "mock_signature_approved",
        },
        headers=auth_h,
    )
    assert success_verify.status_code == 200
    assert success_verify.json()["success"] is True
    assert success_verify.json()["status"] == "PAID"

    # Verify idempotent re-call
    dup_verify = client.post(
        "/api/v1/payments/verify",
        json={
            "order_id": order_id,
            "payment_id": pay_id,
            "signature": "mock_signature_approved",
        },
        headers=auth_h,
    )
    assert dup_verify.status_code == 200
    assert dup_verify.json()["success"] is True

    # Check user membership: should now have 1 available test credit
    mem_res = client.get("/api/v1/users/me/membership", headers=auth_h)
    assert mem_res.status_code == 200
    assert mem_res.json()["available_test_credits"] == 1


def test_subscription_purchase_and_unlimited_access():
    # Register user
    email = f"subscriber_{uuid4().hex[:8]}@example.com"
    token = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password123!"},
    ).json()["access_token"]
    auth_h = {"Authorization": f"Bearer {token}"}

    # Find subscription product
    prods = client.get("/api/v1/products").json()
    sub_prod = next(p for p in prods if p["product_type"] == "SUBSCRIPTION")

    # Create Order
    order_data = client.post(
        "/api/v1/payments/create-order",
        json={"product_id": sub_prod["id"]},
        headers=auth_h,
    ).json()

    # Verify payment
    verify_res = client.post(
        "/api/v1/payments/verify",
        json={
            "order_id": order_data["order_id"],
            "payment_id": f"pay_sub_{uuid4().hex[:10]}",
            "signature": "mock_signature_approved",
        },
        headers=auth_h,
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["subscription_id"] is not None

    # Check membership: should be PRO
    mem = client.get("/api/v1/users/me/membership", headers=auth_h).json()
    assert mem["is_subscribed"] is True
    assert mem["subscription_status"] == "ACTIVE"


def test_paid_test_entitlement_access_enforcement():
    # Find a paid test
    tests = client.get("/api/v1/tests").json()
    paid_test = next(t for t in tests if not t["is_free"])

    # 1. Unauthenticated user cannot start paid test
    unauth_res = client.post(f"/api/v1/tests/{paid_test['id']}/start")
    assert unauth_res.status_code == 401

    # 2. Authenticated user without entitlement/subscription receives 402 Payment Required
    email = f"unpaid_{uuid4().hex[:8]}@example.com"
    token = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password123!"},
    ).json()["access_token"]
    auth_h = {"Authorization": f"Bearer {token}"}

    no_access_res = client.post(f"/api/v1/tests/{paid_test['id']}/start", headers=auth_h)
    assert no_access_res.status_code == 402

    # 3. Buy ₹10 test pass
    prods = client.get("/api/v1/products").json()
    test_prod = next(p for p in prods if p["product_type"] == "TEST")
    order = client.post(
        "/api/v1/payments/create-order",
        json={"product_id": test_prod["id"]},
        headers=auth_h,
    ).json()
    client.post(
        "/api/v1/payments/verify",
        json={
            "order_id": order["order_id"],
            "payment_id": f"pay_pass_{uuid4().hex[:10]}",
            "signature": "mock_signature_approved",
        },
        headers=auth_h,
    )

    # 4. Now starting the paid test succeeds!
    start_res = client.post(f"/api/v1/tests/{paid_test['id']}/start", headers=auth_h)
    assert start_res.status_code == 201
    assert len(start_res.json()["questions"]) == paid_test["question_count"]

    # 5. After consuming the credit, trying to start ANOTHER paid test requires payment again (402)
    next_start_res = client.post(f"/api/v1/tests/{paid_test['id']}/start", headers=auth_h)
    assert next_start_res.status_code == 402

