from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.question import Question


class Category(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "categories"

    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(140), unique=True, nullable=False)
    topics: Mapped[list[Topic]] = relationship(back_populates="category", cascade="all, delete-orphan")
    questions: Mapped[list[Question]] = relationship(back_populates="category")


class Topic(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "topics"
    __table_args__ = (UniqueConstraint("category_id", "name", name="uq_topics_category_name"),)

    category_id = mapped_column(ForeignKey("categories.id", ondelete="CASCADE"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    slug: Mapped[str] = mapped_column(String(140), nullable=False)
    category: Mapped[Category] = relationship(back_populates="topics")
    questions: Mapped[list[Question]] = relationship(back_populates="topic")
