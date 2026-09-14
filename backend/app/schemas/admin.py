from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import Difficulty


class CategoryCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    slug: str = Field(min_length=2, max_length=140, pattern=r"^[a-z0-9-]+$")


class CategoryRead(CategoryCreate):
    model_config = ConfigDict(from_attributes=True)
    id: UUID


class TopicCreate(CategoryCreate):
    category_id: UUID


class TopicRead(TopicCreate):
    model_config = ConfigDict(from_attributes=True)
    id: UUID


class QuestionInput(BaseModel):
    question_text: str = Field(min_length=5)
    option_a: str = Field(min_length=1)
    option_b: str = Field(min_length=1)
    option_c: str = Field(min_length=1)
    option_d: str = Field(min_length=1)
    correct_answer: str = Field(min_length=1, max_length=1)
    explanation: str = Field(min_length=3)
    category_id: UUID
    topic_id: UUID
    difficulty: Difficulty
    estimated_time_seconds: int = Field(default=30, ge=5, le=900)
    is_premium: bool = False
    is_active: bool = True
    source: str | None = Field(default=None, max_length=255)

    @field_validator("correct_answer")
    @classmethod
    def validate_answer(cls, value: str) -> str:
        answer = value.upper()
        if answer not in {"A", "B", "C", "D"}:
            raise ValueError("correct_answer must be A, B, C, or D")
        return answer


class QuestionCreate(QuestionInput):
    pass


class QuestionUpdate(QuestionInput):
    pass


class QuestionRead(QuestionInput):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    created_at: datetime
    updated_at: datetime


class QuestionPage(BaseModel):
    items: list[QuestionRead]
    total: int
    page: int
    page_size: int


class ImportErrorRow(BaseModel):
    row: int
    errors: list[str]


class ImportPreview(BaseModel):
    total_rows: int
    valid_rows: list[QuestionCreate]
    invalid_rows: list[ImportErrorRow]


class ImportCommit(BaseModel):
    questions: list[QuestionCreate] = Field(min_length=1, max_length=5000)


class ImportResult(BaseModel):
    imported_count: int
