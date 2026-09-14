from datetime import datetime
from fastapi.testclient import TestClient
import pytest

from app.main import app

client = TestClient(app)


def test_complete_free_test_e2e_lifecycle():
    # 1. Check published tests
    tests_res = client.get("/api/v1/tests")
    assert tests_res.status_code == 200
    tests = tests_res.json()
    assert len(tests) >= 1
    free_tests = [t for t in tests if t["is_free"]]
    assert len(free_tests) == 1
    free_test = free_tests[0]
    assert free_test["question_count"] == 20
    assert free_test["duration_seconds"] == 900
    assert free_test["price_inr"] == 0

    # 2. Check free test info for fresh guest
    guest_cookie = "test_e2e_guest_session_token_12345678901234567890"
    client.cookies.set("aa_guest_session", guest_cookie)

    info_res = client.get("/api/v1/tests/free/info")
    assert info_res.status_code == 200
    info = info_res.json()
    assert info["test_name"] == free_test["name"]
    assert info["has_active_attempt"] is False

    # 3. Start free test
    start_res = client.post("/api/v1/tests/free/start")
    assert start_res.status_code == 201
    started = start_res.json()
    attempt_id = started["attempt_id"]
    token = started["guest_token"]
    assert len(started["questions"]) == 20
    assert started["duration_seconds"] == 900

    # Security check: correct answer and explanation MUST NOT be in response
    for q in started["questions"]:
        assert "correct_answer" not in q
        assert "explanation" not in q

    # 4. Fetch attempt questions (e.g. on page refresh)
    get_res = client.get(f"/api/v1/attempts/{attempt_id}?guest_token={token}")
    assert get_res.status_code == 200
    fetched = get_res.json()
    assert fetched["attempt_id"] == attempt_id
    assert len(fetched["questions"]) == 20

    # 5. Answer some questions
    q1 = started["questions"][0]
    q2 = started["questions"][1]
    ans1_res = client.put(
        f"/api/v1/attempts/{attempt_id}/answers/{q1['id']}",
        json={"guest_token": token, "selected_answer": "B", "time_spent_seconds": 35},
    )
    assert ans1_res.status_code == 204

    ans2_res = client.put(
        f"/api/v1/attempts/{attempt_id}/answers/{q2['id']}",
        json={"guest_token": token, "selected_answer": "C", "time_spent_seconds": 40},
    )
    assert ans2_res.status_code == 204

    # Verify answers are persisted on reload
    re_fetched = client.get(f"/api/v1/attempts/{attempt_id}?guest_token={token}").json()
    assert re_fetched["questions"][0]["selected_answer"] == "B"
    assert re_fetched["questions"][1]["selected_answer"] == "C"

    # 6. Re-hitting start while active resumes the attempt
    resume_res = client.post("/api/v1/tests/free/start")
    assert resume_res.status_code == 201
    assert resume_res.json()["attempt_id"] == attempt_id

    # 7. Submit test
    submit_res = client.post(
        f"/api/v1/attempts/{attempt_id}/submit",
        json={"guest_token": token},
    )
    assert submit_res.status_code == 200
    sub_data = submit_res.json()
    assert sub_data["status"] == "SUBMITTED"
    assert sub_data["total_questions"] == 20
    assert sub_data["correct_count"] + sub_data["wrong_count"] == 2
    assert sub_data["skipped_count"] == 18

    # 8. Fetch result & review
    result_res = client.get(f"/api/v1/attempts/{attempt_id}/result?guest_token={token}")
    assert result_res.status_code == 200
    review = result_res.json()
    assert review["attempt_id"] == attempt_id
    assert "topic_performance" in review
    assert len(review["topic_performance"]) > 0
    assert "speed_performance" in review
    assert review["speed_performance"]["pace_status"] in {"FAST", "OPTIMAL", "SLOW"}
    assert len(review["answers"]) == 20

    # Verify that in result, explanations and correct answers ARE present
    for ans in review["answers"]:
        assert "correct_answer" in ans
        assert "explanation" in ans
        assert len(ans["explanation"]) > 0

    # 9. Anti-abuse verification: attempting to submit again fails with 409
    dup_submit = client.post(
        f"/api/v1/attempts/{attempt_id}/submit",
        json={"guest_token": token},
    )
    assert dup_submit.status_code == 409

