from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import AttemptStatus, Difficulty, TestStatus


class TestCreate(BaseModel):
    name: str = Field(min_length=3, max_length=180)
    description: str | None = None
    question_count: int = Field(ge=1, le=250)
    duration_seconds: int = Field(ge=60, le=14_400)
    category_id: UUID | None = None
    topic_id: UUID | None = None
    difficulty: Difficulty | None = None
    is_free: bool = False
    is_premium: bool = False
    price_inr: int = Field(default=0, ge=0)
    negative_marking_ratio: float = Field(default=0.0, ge=0.0, le=1.0)
    status: TestStatus = TestStatus.DRAFT


class TestRead(TestCreate):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    category_name: str | None = None
    topic_name: str | None = None
    created_at: datetime
    updated_at: datetime


class TestUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=3, max_length=180)
    description: str | None = None
    question_count: int | None = Field(default=None, ge=1, le=250)
    duration_seconds: int | None = Field(default=None, ge=60, le=14_400)
    category_id: UUID | None = None
    topic_id: UUID | None = None
    difficulty: Difficulty | None = None
    is_free: bool | None = None
    is_premium: bool | None = None
    price_inr: int | None = Field(default=None, ge=0)
    negative_marking_ratio: float | None = Field(default=None, ge=0.0, le=1.0)
    status: TestStatus | None = None


class TestQuestionPublic(BaseModel):
    id: UUID
    position: int
    question_text: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    selected_answer: str | None = None
    difficulty: Difficulty | None = None


class TestPreviewResponse(BaseModel):
    test_id: UUID
    test_name: str
    target_question_count: int
    matching_pool_count: int
    is_sufficient: bool
    sample_questions: list[TestQuestionPublic]


class StartAttemptResponse(BaseModel):
    attempt_id: UUID
    test_id: UUID
    test_name: str
    guest_token: str
    expires_at: datetime
    duration_seconds: int
    total_questions: int
    questions: list[TestQuestionPublic]


class AnswerSave(BaseModel):
    guest_token: str = Field(min_length=20)
    selected_answer: str | None = None
    time_spent_seconds: int | None = Field(default=None, ge=0, le=14_400)

    @field_validator("selected_answer")
    @classmethod
    def answer_is_valid(cls, value: str | None) -> str | None:
        if value is None or value == "":
            return None
        answer = value.upper()
        if answer not in {"A", "B", "C", "D"}:
            raise ValueError("selected_answer must be A, B, C, or D")
        return answer


class SubmitAttempt(BaseModel):
    guest_token: str = Field(min_length=20)


class AttemptResult(BaseModel):
    attempt_id: UUID
    test_id: UUID
    status: AttemptStatus
    total_questions: int
    correct_count: int
    wrong_count: int
    skipped_count: int
    score: int
    accuracy: float
    time_taken_seconds: int
    average_time_seconds: float


class TopicPerformance(BaseModel):
    category: str
    topic: str
    total: int
    correct: int
    accuracy: float


class AnswerReview(BaseModel):
    position: int
    question_id: UUID
    question_text: str
    options: dict[str, str]
    selected_answer: str | None
    correct_answer: str
    is_correct: bool | None
    explanation: str
    difficulty: Difficulty | None = None


class SpeedPerformance(BaseModel):
    average_seconds_per_question: float
    benchmark_seconds_per_question: float = 45.0
    pace_status: str  # "FAST", "OPTIMAL", "SLOW"


class AttemptReview(AttemptResult):
    test_name: str | None = None
    test_difficulty: Difficulty | None = None
    topic_performance: list[TopicPerformance]
    weakest_topic: str | None
    speed_performance: SpeedPerformance
    answers: list[AnswerReview]


class FreeTestInfoResponse(BaseModel):
    test_id: UUID
    test_name: str
    question_count: int
    duration_seconds: int
    has_active_attempt: bool
    active_attempt_id: UUID | None = None
    active_guest_token: str | None = None
    has_completed_free_test: bool = False
    last_attempt_id: UUID | None = None
    last_guest_token: str | None = None
