import uuid
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.db.session import Base, get_db
from app.main import app
from app.models.enums import Difficulty, UserRole
from app.models.user import User


@pytest.fixture
def dedup_client() -> Generator[tuple[TestClient, User, User], None, None]:
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
                email="student@aptitudearena.com",
                full_name="Student One",
                role=UserRole.USER,
                is_active=True,
            )
            admin = User(
                id=uuid.uuid4(),
                email="admin@aptitudearena.com",
                full_name="Admin",
                role=UserRole.ADMIN,
                is_active=True,
            )
            db.add_all([student, admin])
            db.commit()
            db.refresh(student)
            db.refresh(admin)
        yield test_client, student, admin
    app.dependency_overrides.clear()


def test_student_never_receives_duplicate_questions(dedup_client: tuple[TestClient, User, User]) -> None:
    client, student, admin = dedup_client
    admin_token = create_access_token(admin.id)
    student_token = create_access_token(student.id)

    # 1. Admin creates Category, Topic, and 10 questions
    headers_admin = {"Authorization": f"Bearer {admin_token}"}
    cat = client.post("/api/v1/admin/categories", json={"name": "Quant", "slug": "quant"}, headers=headers_admin).json()
    top = client.post(
        "/api/v1/admin/topics",
        json={"name": "Percentages", "slug": "percentages", "category_id": cat["id"]},
        headers=headers_admin,
    ).json()

    for i in range(10):
        client.post(
            "/api/v1/admin/questions",
            json={
                "question_text": f"Percentage question number {i+1}?",
                "option_a": "10",
                "option_b": "20",
                "option_c": "30",
                "option_d": "40",
                "correct_answer": "B",
                "explanation": f"Explanation for question {i+1}",
                "category_id": cat["id"],
                "topic_id": top["id"],
                "difficulty": Difficulty.MEDIUM.value,
                "estimated_time_seconds": 45,
                "is_premium": False,
            },
            headers=headers_admin,
        )

    # 2. Admin creates a 5-question dynamic topic test
    test_obj = client.post(
        "/api/v1/admin/tests",
        json={
            "name": "Percentages Sprint #1",
            "question_count": 5,
            "duration_seconds": 600,
            "category_id": cat["id"],
            "topic_id": top["id"],
            "difficulty": Difficulty.MEDIUM.value,
            "is_free": True,
        },
        headers=headers_admin,
    ).json()
    client.post(f"/api/v1/admin/tests/{test_obj['id']}/publish", headers=headers_admin)

    # 3. Student starts Attempt 1
    headers_student = {"Authorization": f"Bearer {student_token}"}
    att1 = client.post(f"/api/v1/tests/{test_obj['id']}/start", headers=headers_student).json()
    q_ids_att1 = {q["id"] for q in att1["questions"]}
    assert len(q_ids_att1) == 5

    # Submit attempt 1
    client.post(
        f"/api/v1/tests/attempts/{att1['attempt_id']}/submit",
        headers={"X-Guest-Token": att1["guest_token"], **headers_student},
    )

    # 4. Student starts Attempt 2 for the same test
    att2 = client.post(f"/api/v1/tests/{test_obj['id']}/start", headers=headers_student).json()
    q_ids_att2 = {q["id"] for q in att2["questions"]}
    assert len(q_ids_att2) == 5

    # STRICT ZERO-REPEAT CHECK: No overlap between attempt 1 and attempt 2!
    overlap = q_ids_att1.intersection(q_ids_att2)
    assert len(overlap) == 0, f"Found overlapping questions: {overlap}"

