from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.security import create_access_token
from app.db.session import SessionLocal
from app.main import app
from app.models.enums import Difficulty, UserRole
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


def test_admin_analytics_endpoint():
    headers = get_admin_headers()
    response = client.get("/api/v1/admin/analytics", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_users" in data
    assert "total_tests_taken" in data
    assert "total_questions_in_bank" in data
    assert "total_revenue_inr" in data
    assert "paid_purchases_count" in data
    assert "active_subscriptions_count" in data
    assert isinstance(data["recent_registrations"], list)
    assert isinstance(data["recent_payments"], list)
    assert isinstance(data["popular_tests"], list)


def test_student_dashboard_endpoint():
    # Register student
    email = f"student_dash_{uuid4().hex[:8]}@example.com"
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password123!", "full_name": "Aarav Patel"},
    )
    assert reg.status_code == 201
    token = reg.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {token}"}

    # Fetch dashboard
    dash_res = client.get("/api/v1/users/me/dashboard", headers=student_headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert dash_data["user_name"] == "Aarav Patel"
    assert dash_data["email"] == email
    assert dash_data["tests_completed"] == 0
    assert dash_data["questions_attempted"] == 0
    assert dash_data["overall_accuracy"] == 0.0
    assert dash_data["streak_days"] == 0
    assert isinstance(dash_data["weak_topics"], list)
    assert isinstance(dash_data["recent_attempts"], list)


def test_admin_test_management_lifecycle():
    headers = get_admin_headers()
    unique_name = f"TCS Special Sprint #{uuid4().hex[:6]}"

    # 1. Create test
    create_res = client.post(
        "/api/v1/admin/tests",
        headers=headers,
        json={
            "name": unique_name,
            "description": "Special 20 questions quantitative sprint for TCS NQT.",
            "question_count": 20,
            "duration_seconds": 900,
            "difficulty": "MEDIUM",
            "is_free": False,
            "price_inr": 10,
            "negative_marking_ratio": 0.25,
            "status": "DRAFT",
        },
    )
    assert create_res.status_code == 201
    created = create_res.json()
    test_id = created["id"]
    assert created["name"] == unique_name
    assert created["price_inr"] == 10
    assert created["status"] == "DRAFT"

    # 2. Get test
    get_res = client.get(f"/api/v1/admin/tests/{test_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == test_id

    # 3. Preview test question pool
    prev_res = client.get(f"/api/v1/admin/tests/{test_id}/preview", headers=headers)
    assert prev_res.status_code == 200
    prev_data = prev_res.json()
    assert prev_data["test_id"] == test_id
    assert "matching_pool_count" in prev_data
    assert "is_sufficient" in prev_data
    assert isinstance(prev_data["sample_questions"], list)

    # 4. Update test
    up_res = client.put(
        f"/api/v1/admin/tests/{test_id}",
        headers=headers,
        json={"price_inr": 15, "description": "Updated pricing sprint"},
    )
    assert up_res.status_code == 200
    assert up_res.json()["price_inr"] == 15
    assert up_res.json()["description"] == "Updated pricing sprint"

    # 5. Publish test
    pub_res = client.post(f"/api/v1/admin/tests/{test_id}/publish", headers=headers)
    assert pub_res.status_code == 200
    assert pub_res.json()["status"] == "PUBLISHED"

    # 6. Verify in list
    list_res = client.get("/api/v1/admin/tests", headers=headers)
    assert list_res.status_code == 200
    all_tests = list_res.json()
    assert any(t["id"] == test_id for t in all_tests)

    # 7. Archive test
    arc_res = client.post(f"/api/v1/admin/tests/{test_id}/archive", headers=headers)
    assert arc_res.status_code == 200
    assert arc_res.json()["status"] == "ARCHIVED"
