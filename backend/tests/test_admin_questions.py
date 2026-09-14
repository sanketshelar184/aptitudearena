import uuid
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.db.session import Base, get_db
from app.main import app
from app.models.audit import AdminAuditLog
from app.models.enums import UserRole
from app.models.user import User


@pytest.fixture
def session_and_client() -> Generator[tuple[sessionmaker[Session], TestClient], None, None]:
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
        yield testing_session, test_client
    app.dependency_overrides.clear()


@pytest.fixture
def admin_headers(session_and_client: tuple[sessionmaker[Session], TestClient]) -> dict[str, str]:
    session_factory, _ = session_and_client
    with session_factory() as db:
        admin = User(
            id=uuid.uuid4(),
            email="admin@test.com",
            full_name="Admin Tester",
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        token = create_access_token(admin.id)
        return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def user_headers(session_and_client: tuple[sessionmaker[Session], TestClient]) -> dict[str, str]:
    session_factory, _ = session_and_client
    with session_factory() as db:
        user = User(
            id=uuid.uuid4(),
            email="user@test.com",
            full_name="Student Tester",
            role=UserRole.USER,
            is_active=True,
        )
        db.add(user)
        db.commit()
        token = create_access_token(user.id)
        return {"Authorization": f"Bearer {token}"}


def create_taxonomy(client: TestClient, headers: dict[str, str]) -> tuple[dict[str, str], dict[str, str]]:
    category = client.post(
        "/api/v1/admin/categories",
        json={"name": "Quantitative Aptitude", "slug": "quantitative"},
        headers=headers,
    )
    assert category.status_code == 201
    topic = client.post(
        "/api/v1/admin/topics",
        json={"name": "Percentage", "slug": "percentage", "category_id": category.json()["id"]},
        headers=headers,
    )
    assert topic.status_code == 201
    return category.json(), topic.json()


def question_payload(category_id: str, topic_id: str) -> dict[str, object]:
    return {
        "question_text": "What is 20 percent of 200?",
        "option_a": "20",
        "option_b": "30",
        "option_c": "40",
        "option_d": "50",
        "correct_answer": "C",
        "explanation": "20 percent of 200 is 40.",
        "category_id": category_id,
        "topic_id": topic_id,
        "difficulty": "EASY",
        "estimated_time_seconds": 30,
        "is_premium": False,
        "source": "Campus Drive 2024",
    }


def test_admin_authorization_enforced(
    session_and_client: tuple[sessionmaker[Session], TestClient],
    user_headers: dict[str, str],
) -> None:
    _, client = session_and_client
    # Unauthenticated should be rejected
    unauth_res = client.get("/api/v1/admin/questions")
    assert unauth_res.status_code == 401

    # Non-admin user should be forbidden
    forbidden_res = client.get("/api/v1/admin/questions", headers=user_headers)
    assert forbidden_res.status_code == 403


def test_admin_can_create_list_update_and_deactivate_question(
    session_and_client: tuple[sessionmaker[Session], TestClient],
    admin_headers: dict[str, str],
) -> None:
    session_factory, client = session_and_client
    category, topic = create_taxonomy(client, admin_headers)

    # 1. Create question
    created = client.post(
        "/api/v1/admin/questions",
        json=question_payload(category["id"], topic["id"]),
        headers=admin_headers,
    )
    assert created.status_code == 201
    question_id = created.json()["id"]
    assert created.json()["source"] == "Campus Drive 2024"

    # 2. Get single question
    fetched = client.get(f"/api/v1/admin/questions/{question_id}", headers=admin_headers)
    assert fetched.status_code == 200
    assert fetched.json()["id"] == question_id

    # 3. List questions with filter and search
    listed = client.get("/api/v1/admin/questions", params={"search": "percent"}, headers=admin_headers)
    assert listed.status_code == 200
    assert listed.json()["total"] == 1

    # 4. Update question
    update_payload = question_payload(category["id"], topic["id"])
    update_payload["question_text"] = "What is 30 percent of 300?"
    update_payload["option_c"] = "90"
    update_payload["explanation"] = "30 percent of 300 is 90."
    updated = client.put(f"/api/v1/admin/questions/{question_id}", json=update_payload, headers=admin_headers)
    assert updated.status_code == 200
    assert updated.json()["question_text"] == "What is 30 percent of 300?"

    # 5. Deactivate question
    deleted = client.delete(f"/api/v1/admin/questions/{question_id}", headers=admin_headers)
    assert deleted.status_code == 204
    assert client.get("/api/v1/admin/questions", params={"is_active": "false"}, headers=admin_headers).json()["total"] == 1

    # 6. Reactivate question
    activated = client.patch(f"/api/v1/admin/questions/{question_id}/activate", headers=admin_headers)
    assert activated.status_code == 200
    assert activated.json()["is_active"] is True

    # 7. Verify audit log entry
    with session_factory() as db:
        logs = db.scalars(select(AdminAuditLog)).all()
        assert len(logs) >= 4  # category, topic, create, update, deactivate, activate


def test_csv_preview_and_import(
    session_and_client: tuple[sessionmaker[Session], TestClient],
    admin_headers: dict[str, str],
) -> None:
    _, client = session_and_client
    create_taxonomy(client, admin_headers)

    # Download template
    template_res = client.get("/api/v1/admin/questions/import/template", headers=admin_headers)
    assert template_res.status_code == 200
    assert "question_text,option_a,option_b,option_c,option_d,correct_answer" in template_res.text
    assert "source" in template_res.text

    csv_content = """question_text,option_a,option_b,option_c,option_d,correct_answer,explanation,category,topic,difficulty,estimated_time_seconds,is_premium,source
What is 20 percent of 200?,20,30,40,50,C,20 percent of 200 is 40.,Quantitative Aptitude,Percentage,EASY,30,false,Placement 2024
Broken question,A,B,C,D,E,Missing answer,Unknown,Percentage,EASY,30,false,Source
"""
    response = client.post(
        "/api/v1/admin/questions/import/preview",
        files={"file": ("questions.csv", csv_content, "text/csv")},
        headers=admin_headers,
    )
    assert response.status_code == 200
    preview = response.json()
    assert len(preview["valid_rows"]) == 1
    assert len(preview["invalid_rows"]) == 1
    assert preview["valid_rows"][0]["source"] == "Placement 2024"

    imported = client.post(
        "/api/v1/admin/questions/import",
        json={"questions": preview["valid_rows"]},
        headers=admin_headers,
    )
    assert imported.status_code == 201
    assert imported.json()["imported_count"] == 1


def test_public_taxonomy_endpoints(
    session_and_client: tuple[sessionmaker[Session], TestClient],
    admin_headers: dict[str, str],
) -> None:
    _, client = session_and_client
    category, topic = create_taxonomy(client, admin_headers)

    # Public GET /categories (no auth header needed)
    cats = client.get("/api/v1/categories")
    assert cats.status_code == 200
    assert len(cats.json()) >= 1

    # Public GET /topics
    topics = client.get("/api/v1/topics", params={"category_id": category["id"]})
    assert topics.status_code == 200
    assert len(topics.json()) == 1
    assert topics.json()[0]["name"] == "Percentage"
