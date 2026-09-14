from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import AttemptStatus

if TYPE_CHECKING:
    from app.models.question import Question
    from app.models.test import Test
    from app.models.user import User


class TestAttempt(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "test_attempts"
    __table_args__ = (Index("ix_attempts_user_created", "user_id", "created_at"),)

    user_id = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True)
    test_id = mapped_column(ForeignKey("tests.id", ondelete="RESTRICT"), index=True, nullable=False)
    guest_token_hash: Mapped[str | None] = mapped_column(String(255), index=True)
    status: Mapped[AttemptStatus] = mapped_column(Enum(AttemptStatus), default=AttemptStatus.IN_PROGRESS, nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False)
    correct_count: Mapped[int | None] = mapped_column(Integer)
    wrong_count: Mapped[int | None] = mapped_column(Integer)
    skipped_count: Mapped[int | None] = mapped_column(Integer)
    score: Mapped[int | None] = mapped_column(Integer)

    user: Mapped[User | None] = relationship(back_populates="attempts")
    test: Mapped[Test] = relationship()
    answers: Mapped[list[TestAnswer]] = relationship(back_populates="attempt", cascade="all, delete-orphan")


class TestAnswer(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "test_answers"
    __table_args__ = (UniqueConstraint("attempt_id", "question_id", name="uq_test_answers_attempt_question"),)

    attempt_id = mapped_column(ForeignKey("test_attempts.id", ondelete="CASCADE"), index=True, nullable=False)
    question_id = mapped_column(ForeignKey("questions.id", ondelete="RESTRICT"), index=True, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    selected_answer: Mapped[str | None] = mapped_column(String(1))
    is_correct: Mapped[bool | None]
    time_spent_seconds: Mapped[int | None] = mapped_column(Integer)

    attempt: Mapped[TestAttempt] = relationship(back_populates="answers")
    question: Mapped[Question] = relationship()
