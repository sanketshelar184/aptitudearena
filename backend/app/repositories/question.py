from uuid import UUID

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from app.models.enums import Difficulty
from app.models.question import Question


def question_query(
    *, search: str | None, category_id: UUID | None, topic_id: UUID | None,
    difficulty: Difficulty | None, is_active: bool | None,
) -> Select[tuple[Question]]:
    query = select(Question)
    if search:
        term = f"%{search.strip()}%"
        query = query.where(or_(Question.question_text.ilike(term), Question.explanation.ilike(term)))
    if category_id:
        query = query.where(Question.category_id == category_id)
    if topic_id:
        query = query.where(Question.topic_id == topic_id)
    if difficulty:
        query = query.where(Question.difficulty == difficulty)
    if is_active is not None:
        query = query.where(Question.is_active == is_active)
    return query.order_by(Question.created_at.desc())


def list_questions(db: Session, **filters: object) -> tuple[list[Question], int]:
    page = int(filters.pop("page"))
    page_size = int(filters.pop("page_size"))
    query = question_query(**filters)  # type: ignore[arg-type]
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    items = db.scalars(query.offset((page - 1) * page_size).limit(page_size)).all()
    return items, total
