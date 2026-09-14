from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Enum, Float, ForeignKey, Integer, String, Text, UniqueConstraint

from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import Difficulty, TestStatus

if TYPE_CHECKING:
    from app.models.question import Question
    from app.models.taxonomy import Category, Topic


class Test(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "tests"

    name: Mapped[str] = mapped_column(String(180), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    question_count: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    category_id = mapped_column(ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    topic_id = mapped_column(ForeignKey("topics.id", ondelete="SET NULL"), nullable=True)
    difficulty: Mapped[Difficulty | None] = mapped_column(Enum(Difficulty))
    is_free: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    price_inr: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    negative_marking_ratio: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[TestStatus] = mapped_column(Enum(TestStatus), default=TestStatus.DRAFT, nullable=False)


    category: Mapped[Category | None] = relationship()
    topic: Mapped[Topic | None] = relationship()
    questions: Mapped[list[TestQuestion]] = relationship(back_populates="test", cascade="all, delete-orphan")


class TestQuestion(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "test_questions"
    __table_args__ = (UniqueConstraint("test_id", "question_id", name="uq_test_questions_test_question"),)

    test_id = mapped_column(ForeignKey("tests.id", ondelete="CASCADE"), index=True, nullable=False)
    question_id = mapped_column(ForeignKey("questions.id", ondelete="RESTRICT"), index=True, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    test: Mapped[Test] = relationship(back_populates="questions")
    question: Mapped[Question] = relationship()
