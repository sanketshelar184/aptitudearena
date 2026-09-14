import uuid
from collections.abc import Generator
from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.db.session import Base, get_db
from app.main import app
from app.models.enums import UserRole
from app.models.user import User
from app.services import test_engine


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
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
            admin = User(
                id=uuid.uuid4(),
                email="admin@test.com",
                full_name="Admin",
                role=UserRole.ADMIN,
                is_active=True,
            )
            db.add(admin)
            db.commit()
            test_client.headers["Authorization"] = f"Bearer {create_access_token(admin.id)}"
        yield test_client
    app.dependency_overrides.clear()


def setup_published_test(client: TestClient) -> str:
    category = client.post("/api/v1/admin/categories", json={"name": "Reasoning", "slug": "reasoning"}).json()
    topic = client.post(
        "/api/v1/admin/topics",
        json={"name": "Number Series", "slug": "number-series", "category_id": category["id"]},
    ).json()
    question = {
        "question_text": "What number comes next: 2, 4, 6?",
        "option_a": "7",
        "option_b": "8",
        "option_c": "9",
        "option_d": "10",
        "correct_answer": "B",
        "explanation": "The sequence increases by two.",
        "category_id": category["id"],
        "topic_id": topic["id"],
        "difficulty": "EASY",
        "estimated_time_seconds": 30,
        "is_premium": False,
    }
    assert client.post("/api/v1/admin/questions", json=question).status_code == 201
    test = client.post(
        "/api/v1/admin/tests",
        json={
            "name": "Free reasoning test",
            "question_count": 1,
            "duration_seconds": 300,
            "category_id": category["id"],
            "status": "PUBLISHED",
            "is_free": True,
            "price_inr": 0,
            "negative_marking_ratio": 0.0,
        },
    )
    assert test.status_code == 201
    return test.json()["id"]


def test_guest_attempt_scores_server_side_and_hides_answers(client: TestClient) -> None:
    test_id = setup_published_test(client)

    # Test single fetch
    single = client.get(f"/api/v1/tests/{test_id}")
    assert single.status_code == 200
    assert single.json()["name"] == "Free reasoning test"

    started = client.post(f"/api/v1/tests/{test_id}/start")
    assert started.status_code == 201
    data = started.json()
    assert "correct_answer" not in data["questions"][0]

    answer = client.put(
        f"/api/v1/attempts/{data['attempt_id']}/answers/{data['questions'][0]['id']}",
        json={"guest_token": data["guest_token"], "selected_answer": "B", "time_spent_seconds": 12},
    )
    assert answer.status_code == 204
    result = client.post(f"/api/v1/attempts/{data['attempt_id']}/submit", json={"guest_token": data["guest_token"]})
    assert result.status_code == 200
    assert result.json()["score"] == 1
    assert result.json()["accuracy"] == 100

    review = client.get(f"/api/v1/attempts/{data['attempt_id']}/result", params={"guest_token": data["guest_token"]})
    assert review.status_code == 200
    assert review.json()["weakest_topic"] == "Number Series"
    assert review.json()["answers"][0]["correct_answer"] == "B"
    assert review.json()["answers"][0]["explanation"] == "The sequence increases by two."
    assert "speed_performance" in review.json()

    # Duplicate submission should be rejected
    assert client.post(f"/api/v1/attempts/{data['attempt_id']}/submit", json={"guest_token": data["guest_token"]}).status_code == 409


def test_expired_attempt_rejects_new_answers_and_scores_saved_state(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    test_id = setup_published_test(client)
    started = client.post(f"/api/v1/tests/{test_id}/start").json()
    monkeypatch.setattr(
        test_engine,
        "utc_now",
        lambda: test_engine.as_utc(datetime.fromisoformat(started["expires_at"])),
    )

    saved = client.put(
        f"/api/v1/attempts/{started['attempt_id']}/answers/{started['questions'][0]['id']}",
        json={"guest_token": started["guest_token"], "selected_answer": "B"},
    )
    assert saved.status_code == 409
    result = client.post(f"/api/v1/attempts/{started['attempt_id']}/submit", json={"guest_token": started["guest_token"]})
    assert result.status_code == 200
    assert result.json()["status"] == "EXPIRED"
    assert result.json()["score"] == 0


def test_free_test_info_and_resume_flow(client: TestClient) -> None:
    test_id = setup_published_test(client)

    # Check free info
    info = client.get("/api/v1/tests/free/info")
    assert info.status_code == 200
    assert info.json()["test_name"] == "Free reasoning test"
    assert info.json()["has_active_attempt"] is False

    # Start free test
    start_res = client.post("/api/v1/tests/free/start")
    assert start_res.status_code == 201
    attempt_data = start_res.json()
    attempt_id = attempt_data["attempt_id"]
    guest_token = attempt_data["guest_token"]

    # Re-starting with same token/cookie resumes ongoing attempt
    client.cookies.set("aa_guest_session", guest_token)
    resumed = client.post("/api/v1/tests/free/start")
    assert resumed.status_code == 201
    assert resumed.json()["attempt_id"] == attempt_id  # Same attempt resumed!

    # Save an answer
    q_id = attempt_data["questions"][0]["id"]
    save_res = client.put(
        f"/api/v1/attempts/{attempt_id}/answers/{q_id}",
        json={"guest_token": guest_token, "selected_answer": "B"},
    )
    assert save_res.status_code == 204

    # Fetch attempt directly (simulate page reload)
    fetched = client.get(f"/api/v1/attempts/{attempt_id}?guest_token={guest_token}")
    assert fetched.status_code == 200
    fetched_data = fetched.json()
    assert fetched_data["attempt_id"] == attempt_id
    assert fetched_data["questions"][0]["selected_answer"] == "B"
    # Ensure correct answers are NOT exposed
    for q in fetched_data["questions"]:
        assert "correct_answer" not in q
        assert "explanation" not in q
