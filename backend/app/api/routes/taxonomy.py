from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
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
) -> list[Topic]:
    query = select(Topic)
    if category_id:
        query = query.where(Topic.category_id == category_id)
    return list(db.scalars(query.order_by(Topic.name)).all())

