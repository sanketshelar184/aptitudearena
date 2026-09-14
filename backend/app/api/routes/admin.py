from datetime import datetime, timezone
import json
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy import select
from sqlalchemy import Float, cast, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.dependencies.auth import require_admin
from app.db.session import get_db
from app.models.attempt import TestAttempt
from app.models.audit import AdminAuditLog
from app.models.enums import Difficulty
from app.models.commerce import Payment, Product, Subscription
from app.models.enums import AttemptStatus, Difficulty, PaymentStatus, SubscriptionStatus, TestStatus
from app.models.question import Question
from app.models.taxonomy import Category, Topic
from app.models.test import Test
from app.models.user import User
from app.repositories.question import list_questions
from app.schemas.admin import (
    CategoryCreate,
    CategoryRead,
    ImportCommit,
    ImportPreview,
    ImportResult,
    QuestionCreate,
    QuestionPage,
    QuestionRead,
    QuestionUpdate,
    TopicCreate,
    TopicRead,
)
from app.schemas.admin_analytics import (
    AdminAnalyticsResponse,
    PopularTest,
    RecentPayment,
    RecentRegistration,
)
from app.schemas.test_engine import (
    TestCreate,
    TestPreviewResponse,
    TestQuestionPublic,
    TestRead,
    TestUpdate,
)
from app.services.question_import import csv_template, validate_csv

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


def log_admin_action(
    db: Session,
    admin: User,
    action: str,
    target_type: str,
    target_id: str | None = None,
    details: dict | None = None,
) -> None:
    log_entry = AdminAuditLog(
        admin_id=admin.id,
        action=action,
        target_type=target_type,
        target_id=str(target_id) if target_id else None,
        details=json.dumps(details) if details else None,
    )
    db.add(log_entry)


@router.get("/categories", response_model=list[CategoryRead])
def get_categories(db: Session = Depends(get_db)) -> list[Category]:
    return list(db.scalars(select(Category).order_by(Category.name)).all())


@router.post("/categories", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Category:
    category = Category(**payload.model_dump())
    db.add(category)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="Category name or slug already exists") from error
    db.refresh(category)
    log_admin_action(db, admin, "CREATE_CATEGORY", "category", str(category.id), {"name": category.name})
    db.commit()
    return category


@router.post("/topics", response_model=TopicRead, status_code=status.HTTP_201_CREATED)
def create_topic(
    payload: TopicCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Topic:
    if not db.get(Category, payload.category_id):
        raise HTTPException(status_code=404, detail="Category not found")
    topic = Topic(**payload.model_dump())
    db.add(topic)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="Topic already exists in this category") from error
    db.refresh(topic)
    log_admin_action(db, admin, "CREATE_TOPIC", "topic", str(topic.id), {"name": topic.name})
    db.commit()
    return topic


@router.get("/questions", response_model=QuestionPage)
def get_questions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    search: str | None = None,
    category_id: UUID | None = None,
    topic_id: UUID | None = None,
    difficulty: Difficulty | None = None,
    is_active: bool | None = None,
    db: Session = Depends(get_db),
) -> QuestionPage:
    items, total = list_questions(
        db,
        page=page,
        page_size=page_size,
        search=search,
        category_id=category_id,
        topic_id=topic_id,
        difficulty=difficulty,
        is_active=is_active,
    )
    return QuestionPage(items=items, total=total, page=page, page_size=page_size)


@router.get("/questions/{question_id}", response_model=QuestionRead)
def get_question(question_id: UUID, db: Session = Depends(get_db)) -> Question:
    question = db.get(Question, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question


@router.post("/questions", response_model=QuestionRead, status_code=status.HTTP_201_CREATED)
def create_question(
    payload: QuestionCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Question:
    topic = db.get(Topic, payload.topic_id)
    if not topic or not db.get(Category, payload.category_id) or topic.category_id != payload.category_id:
        raise HTTPException(status_code=400, detail="Topic must belong to the selected category")
    question = Question(**payload.model_dump())
    db.add(question)
    db.commit()
    db.refresh(question)
    log_admin_action(db, admin, "CREATE_QUESTION", "question", str(question.id), {"topic_id": str(payload.topic_id)})
    db.commit()
    return question


@router.put("/questions/{question_id}", response_model=QuestionRead)
def update_question(
    question_id: UUID,
    payload: QuestionUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Question:
    question = db.get(Question, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    topic = db.get(Topic, payload.topic_id)
    if not topic or not db.get(Category, payload.category_id) or topic.category_id != payload.category_id:
        raise HTTPException(status_code=400, detail="Topic must belong to the selected category")
    for field, value in payload.model_dump().items():
        setattr(question, field, value)
    db.commit()
    db.refresh(question)
    log_admin_action(db, admin, "UPDATE_QUESTION", "question", str(question.id))
    db.commit()
    return question


@router.delete("/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def deactivate_question(
    question_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Response:
    question = db.get(Question, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    question.is_active = False
    db.commit()
    log_admin_action(db, admin, "DEACTIVATE_QUESTION", "question", str(question.id))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.patch("/questions/{question_id}/activate", response_model=QuestionRead)
def activate_question(
    question_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Question:
    question = db.get(Question, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    question.is_active = True
    db.commit()
    db.refresh(question)
    log_admin_action(db, admin, "ACTIVATE_QUESTION", "question", str(question.id))
    db.commit()
    return question


@router.get("/questions/import/template", response_class=Response)
def download_question_template() -> Response:
    return Response(
        csv_template(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=question-import-template.csv"},
    )


@router.post("/questions/import/preview", response_model=ImportPreview)
async def preview_question_import(file: UploadFile = File(...), db: Session = Depends(get_db)) -> ImportPreview:
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Upload a CSV file")
    try:
        return validate_csv(await file.read(), db)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error


@router.post("/questions/import", response_model=ImportResult, status_code=status.HTTP_201_CREATED)
def import_questions(
    payload: ImportCommit,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ImportResult:
    questions = [Question(**item.model_dump()) for item in payload.questions]
    db.add_all(questions)
    db.commit()
    log_admin_action(
        db, admin, "IMPORT_QUESTIONS", "question", None, {"imported_count": len(questions)}
    )
    db.commit()
    return ImportResult(imported_count=len(questions))


def enrich_test(db: Session, test: Test) -> TestRead:
    cat = db.get(Category, test.category_id) if test.category_id else None
    top = db.get(Topic, test.topic_id) if test.topic_id else None
    data = TestRead.model_validate(test)
    data.category_name = cat.name if cat else "Mixed / Comprehensive"
    data.topic_name = top.name if top else "Mixed Topics"
    return data


# Admin Analytics Endpoint
@router.get("/analytics", response_model=AdminAnalyticsResponse)
def get_admin_analytics(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminAnalyticsResponse:
    now = datetime.now(timezone.utc)

    total_users = db.scalar(select(func.count(User.id))) or 0
    total_tests_taken = db.scalar(select(func.count(TestAttempt.id))) or 0
    total_questions_in_bank = (
        db.scalar(select(func.count(Question.id)).where(Question.is_active.is_(True))) or 0
    )
    total_revenue_paise = (
        db.scalar(
            select(func.coalesce(func.sum(Payment.amount_paise), 0)).where(
                Payment.status == PaymentStatus.PAID
            )
        )
        or 0
    )
    total_revenue_inr = total_revenue_paise // 100

    paid_purchases_count = (
        db.scalar(
            select(func.count(Payment.id)).where(Payment.status == PaymentStatus.PAID)
        )
        or 0
    )
    active_subscriptions_count = (
        db.scalar(
            select(func.count(Subscription.id)).where(
                Subscription.status == SubscriptionStatus.ACTIVE,
                (Subscription.end_date.is_(None) | (Subscription.end_date > now)),
            )
        )
        or 0
    )

    recent_users = list(
        db.scalars(select(User).order_by(User.created_at.desc()).limit(8)).all()
    )
    recent_registrations = [
        RecentRegistration(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            role=u.role.value,
            is_active=u.is_active,
            created_at=u.created_at,
        )
        for u in recent_users
    ]

    recent_pays = list(
        db.scalars(select(Payment).order_by(Payment.created_at.desc()).limit(8)).all()
    )
    products_map = {
        p.id: p.name
        for p in db.scalars(
            select(Product).where(Product.id.in_([pay.product_id for pay in recent_pays]))
        ).all()
    }
    users_map = {
        u.id: u.email
        for u in db.scalars(
            select(User).where(User.id.in_([pay.user_id for pay in recent_pays]))
        ).all()
    }

    recent_payments = [
        RecentPayment(
            id=pay.id,
            user_email=users_map.get(pay.user_id, "student@aptitudearena.com"),
            amount_inr=pay.amount_paise // 100,
            status=pay.status,
            product_name=products_map.get(pay.product_id, "Test Pass / Subscription"),
            created_at=pay.created_at,
        )
        for pay in recent_pays
    ]

    popular_test_rows = db.execute(
        select(
            TestAttempt.test_id,
            func.count(TestAttempt.id).label("attempt_count"),
            func.coalesce(
                func.avg(
                    cast(TestAttempt.score, Float)
                    * 100.0
                    / func.nullif(TestAttempt.total_questions, 0)
                ),
                0.0,
            ).label("avg_acc"),
        )
        .group_by(TestAttempt.test_id)
        .order_by(func.count(TestAttempt.id).desc())
        .limit(5)
    ).all()

    popular_tests_map = {
        t.id: t.name
        for t in db.scalars(
            select(Test).where(Test.id.in_([r.test_id for r in popular_test_rows]))
        ).all()
    }

    popular_tests = [
        PopularTest(
            test_id=r.test_id,
            test_name=popular_tests_map.get(r.test_id, "Placement Test"),
            attempt_count=r.attempt_count,
            average_accuracy=round(float(r.avg_acc), 1),
        )
        for r in popular_test_rows
    ]

    return AdminAnalyticsResponse(
        total_users=total_users,
        total_tests_taken=total_tests_taken,
        total_questions_in_bank=total_questions_in_bank,
        total_revenue_inr=total_revenue_inr,
        paid_purchases_count=paid_purchases_count,
        active_subscriptions_count=active_subscriptions_count,
        recent_registrations=recent_registrations,
        recent_payments=recent_payments,
        popular_tests=popular_tests,
    )


# Admin Test Management Endpoints
@router.get("/tests", response_model=list[TestRead])
def admin_list_tests(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[TestRead]:
    tests = list(
        db.scalars(
            select(Test).order_by(Test.is_free.desc(), Test.created_at.desc())
        ).all()
    )
    return [enrich_test(db, t) for t in tests]


@router.post("/tests", response_model=TestRead, status_code=status.HTTP_201_CREATED)
def admin_create_test(
    payload: TestCreate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> TestRead:
    test = Test(**payload.model_dump())
    db.add(test)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="A test with this name already exists") from error
    db.refresh(test)
    log_admin_action(db, admin, "CREATE_TEST", "test", str(test.id), {"name": test.name})
    db.commit()
    return enrich_test(db, test)


@router.get("/tests/{test_id}", response_model=TestRead)
def admin_get_test(
    test_id: UUID,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> TestRead:
    test = db.get(Test, test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    return enrich_test(db, test)


@router.put("/tests/{test_id}", response_model=TestRead)
def admin_update_test(
    test_id: UUID,
    payload: TestUpdate,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> TestRead:
    test = db.get(Test, test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(test, field, val)

    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="A test with this name already exists") from error

    db.refresh(test)
    log_admin_action(db, admin, "UPDATE_TEST", "test", str(test.id), update_data)
    db.commit()
    return enrich_test(db, test)


@router.post("/tests/{test_id}/publish", response_model=TestRead)
def admin_publish_test(
    test_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> TestRead:
    test = db.get(Test, test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    test.status = TestStatus.PUBLISHED
    db.commit()
    db.refresh(test)
    log_admin_action(db, admin, "PUBLISH_TEST", "test", str(test.id))
    db.commit()
    return enrich_test(db, test)


@router.post("/tests/{test_id}/archive", response_model=TestRead)
def admin_archive_test(
    test_id: UUID,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> TestRead:
    test = db.get(Test, test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    test.status = TestStatus.ARCHIVED
    db.commit()
    db.refresh(test)
    log_admin_action(db, admin, "ARCHIVE_TEST", "test", str(test.id))
    db.commit()
    return enrich_test(db, test)


@router.get("/tests/{test_id}/preview", response_model=TestPreviewResponse)
def admin_preview_test(
    test_id: UUID,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> TestPreviewResponse:
    test = db.get(Test, test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    # Match active question pool
    query = select(Question).where(Question.is_active.is_(True))
    if test.category_id:
        query = query.where(Question.category_id == test.category_id)
    if test.topic_id:
        query = query.where(Question.topic_id == test.topic_id)
    if test.difficulty:
        query = query.where(Question.difficulty == test.difficulty)

    matching_count = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    sample_questions = list(db.scalars(query.limit(5)).all())

    return TestPreviewResponse(
        test_id=test.id,
        test_name=test.name,
        target_question_count=test.question_count,
        matching_pool_count=matching_count,
        is_sufficient=matching_count >= test.question_count,
        sample_questions=[
            TestQuestionPublic(
                id=q.id,
                position=i + 1,
                question_text=q.question_text,
                option_a=q.option_a,
                option_b=q.option_b,
                option_c=q.option_c,
                option_d=q.option_d,
            )
            for i, q in enumerate(sample_questions)
        ],
    )
