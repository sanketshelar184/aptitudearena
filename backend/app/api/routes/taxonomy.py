from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.question import Question
from app.models.taxonomy import Category, Topic
from app.schemas.admin import CategoryRead, TopicRead

router = APIRouter(tags=["taxonomy"])


@router.get("/categories", response_model=list[CategoryRead])
def list_categories(db: Session = Depends(get_db)) -> list[Category]:
    return list(db.scalars(select(Category).order_by(Category.name)).all())


@router.get("/topics", response_model=list[TopicRead])
def list_topics(
    category_id: UUID | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[TopicRead]:
    subq = (
        select(Question.topic_id, func.count(Question.id).label("q_count"))
        .where(Question.is_active.is_(True))
        .group_by(Question.topic_id)
        .subquery()
    )

    query = (
        select(Topic, func.coalesce(subq.c.q_count, 0).label("q_count"))
        .outerjoin(subq, Topic.id == subq.c.topic_id)
    )
    if category_id:
        query = query.where(Topic.category_id == category_id)

    results = db.execute(query.order_by(Topic.name)).all()

    return [
        TopicRead(
            id=t.id,
            name=t.name,
            slug=t.slug,
            category_id=t.category_id,
            question_count=int(cnt),
        )
        for t, cnt in results
    ]

