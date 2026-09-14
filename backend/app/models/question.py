from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import Difficulty

if TYPE_CHECKING:
    from app.models.taxonomy import Category, Topic


class Question(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "questions"
    __table_args__ = (
        Index("ix_questions_active_category_difficulty", "is_active", "category_id", "difficulty"),
    )

    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    option_a: Mapped[str] = mapped_column(Text, nullable=False)
    option_b: Mapped[str] = mapped_column(Text, nullable=False)
    option_c: Mapped[str] = mapped_column(Text, nullable=False)
    option_d: Mapped[str] = mapped_column(Text, nullable=False)
    correct_answer: Mapped[str] = mapped_column(String(1), nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    category_id = mapped_column(ForeignKey("categories.id", ondelete="RESTRICT"), index=True, nullable=False)
    topic_id = mapped_column(ForeignKey("topics.id", ondelete="RESTRICT"), index=True, nullable=False)
    difficulty: Mapped[Difficulty] = mapped_column(Enum(Difficulty), index=True, nullable=False)
    estimated_time_seconds: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    is_premium: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True, nullable=False)
    source: Mapped[str | None] = mapped_column(String(255))

    category: Mapped[Category] = relationship(back_populates="questions")
    topic: Mapped[Topic] = relationship(back_populates="questions")
