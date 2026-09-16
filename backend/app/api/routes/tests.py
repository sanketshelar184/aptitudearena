import secrets
from uuid import UUID

from fastapi import APIRouter, Cookie, Depends, Header, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies.auth import bearer_scheme, require_admin
from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.attempt import TestAnswer, TestAttempt
from app.models.enums import AttemptStatus, TestStatus, UserRole
from app.models.question import Question
from app.models.taxonomy import Category, Topic
from app.models.test import Test
from app.models.user import User
from app.schemas.test_engine import (
    AnswerSave,
    AttemptResult,
    AttemptReview,
    FreeTestInfoResponse,
    StartAttemptResponse,
    SubmitAttempt,
    TestCreate,
    TestQuestionPublic,
    TestRead,
)
from app.services.commerce import check_user_test_access, consume_user_test_access
from app.services.test_engine import (
    as_utc,
    ensure_active,
    hash_guest_token,
    owned_attempt,
    result_summary,
    review_attempt,
    score_attempt,
    start_guest_attempt,
    utc_now,
)

router = APIRouter(tags=["tests"])


def get_optional_user(
    credentials=Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    if not credentials:
        return None
    try:
        user_id = decode_access_token(credentials.credentials)
        user = db.get(User, user_id)
        return user if (user and user.is_active) else None
    except Exception:
        return None


def get_or_create_guest_token(
    aa_guest_session: str | None = Cookie(default=None),
    x_guest_session: str | None = Header(default=None),
) -> tuple[str, bool]:
    """Returns (token, is_new)."""
    token = aa_guest_session or x_guest_session
    if token and len(token) >= 20:
        return token, False
    return secrets.token_urlsafe(32), True


def enrich_test(db: Session, test: Test) -> TestRead:
    cat = db.get(Category, test.category_id) if test.category_id else None
    top = db.get(Topic, test.topic_id) if test.topic_id else None
    data = TestRead.model_validate(test)
    data.category_name = cat.name if cat else "Mixed / Comprehensive"
    data.topic_name = top.name if top else "Mixed Topics"
    return data


@router.get("/tests", response_model=list[TestRead])
def list_published_tests(db: Session = Depends(get_db)) -> list[TestRead]:
    tests = list(
        db.scalars(
            select(Test)
            .where(Test.status == TestStatus.PUBLISHED)
            .order_by(Test.is_free.desc(), Test.created_at.desc())
        ).all()
    )
    return [enrich_test(db, t) for t in tests]


@router.get("/tests/{test_id}", response_model=TestRead)
def get_test(test_id: UUID, db: Session = Depends(get_db)) -> TestRead:
    test = db.get(Test, test_id)
    if not test or test.status != TestStatus.PUBLISHED:
        raise HTTPException(status_code=404, detail="Test not found")
    return enrich_test(db, test)


@router.post("/admin/tests", response_model=TestRead, status_code=status.HTTP_201_CREATED, tags=["admin"])
def create_test(
    payload: TestCreate,
    _: object = Depends(require_admin),
    db: Session = Depends(get_db),
) -> TestRead:
    test = Test(**payload.model_dump())
    db.add(test)
    db.commit()
    db.refresh(test)
    return enrich_test(db, test)


@router.get("/tests/free/info", response_model=FreeTestInfoResponse)
def get_free_test_info(
    guest_info: tuple[str, bool] = Depends(get_or_create_guest_token),
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> FreeTestInfoResponse:
    free_test = db.scalar(
        select(Test).where(Test.is_free.is_(True), Test.status == TestStatus.PUBLISHED)
    )
    if not free_test:
        raise HTTPException(status_code=404, detail="No published free test is currently available.")

    guest_token, _ = guest_info
    token_hash = hash_guest_token(guest_token)

    query = select(TestAttempt).where(TestAttempt.test_id == free_test.id)
    if user:
        query = query.where(TestAttempt.user_id == user.id)
    else:
        query = query.where(TestAttempt.guest_token_hash == token_hash)

    latest_attempt = db.scalar(query.order_by(TestAttempt.created_at.desc()))

    has_active = False
    active_id = None
    active_token = None
    has_completed = False
    last_id = None
    last_token = None

    if latest_attempt:
        last_id = latest_attempt.id
        last_token = guest_token
        if latest_attempt.status == AttemptStatus.IN_PROGRESS and utc_now() < as_utc(latest_attempt.expires_at):
            has_active = True
            active_id = latest_attempt.id
            active_token = guest_token
        else:
            has_completed = True

    if user and user.free_test_consumed:
        has_completed = True

    return FreeTestInfoResponse(
        test_id=free_test.id,
        test_name=free_test.name,
        question_count=free_test.question_count,
        duration_seconds=free_test.duration_seconds,
        has_active_attempt=has_active,
        active_attempt_id=active_id,
        active_guest_token=active_token,
        has_completed_free_test=has_completed,
        last_attempt_id=last_id,
        last_guest_token=last_token,
    )


@router.post("/tests/free/start", response_model=StartAttemptResponse, status_code=status.HTTP_201_CREATED)
def start_or_resume_free_test(
    response: Response,
    guest_info: tuple[str, bool] = Depends(get_or_create_guest_token),
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> StartAttemptResponse:
    free_test = db.scalar(
        select(Test).where(Test.is_free.is_(True), Test.status == TestStatus.PUBLISHED)
    )
    if not free_test:
        raise HTTPException(status_code=404, detail="No free placement test is currently available.")

    guest_token, is_new = guest_info
    if is_new:
        response.set_cookie(
            key="aa_guest_session",
            value=guest_token,
            max_age=86400 * 60,
            httponly=True,
            samesite="lax",
        )

    token_hash = hash_guest_token(guest_token)

    # Check for existing active attempt to resume
    query = select(TestAttempt).where(TestAttempt.test_id == free_test.id)
    if user:
        if user.free_test_consumed:
            raise HTTPException(
                status_code=403,
                detail="You have already completed your free placement test. Explore our full test bank to continue.",
            )
        query = query.where(TestAttempt.user_id == user.id)
    else:
        query = query.where(TestAttempt.guest_token_hash == token_hash)

    latest_attempt = db.scalar(query.order_by(TestAttempt.created_at.desc()))

    if latest_attempt and latest_attempt.status == AttemptStatus.IN_PROGRESS:
        if utc_now() < as_utc(latest_attempt.expires_at):
            # Resume ongoing attempt
            answers = list(
                db.scalars(
                    select(TestAnswer)
                    .where(TestAnswer.attempt_id == latest_attempt.id)
                    .order_by(TestAnswer.position)
                ).all()
            )
            questions_map = {
                q.id: q
                for q in db.scalars(select(Question).where(Question.id.in_([a.question_id for a in answers]))).all()
            }
            ordered_items = [(a, questions_map[a.question_id]) for a in answers if a.question_id in questions_map]

            return StartAttemptResponse(
                attempt_id=latest_attempt.id,
                test_id=free_test.id,
                test_name=free_test.name,
                guest_token=guest_token,
                expires_at=latest_attempt.expires_at,
                duration_seconds=free_test.duration_seconds,
                total_questions=latest_attempt.total_questions,
                questions=[
                    TestQuestionPublic(
                        id=q.id,
                        position=ans.position,
                        question_text=q.question_text,
                        option_a=q.option_a,
                        option_b=q.option_b,
                        option_c=q.option_c,
                        option_d=q.option_d,
                        selected_answer=ans.selected_answer,
                        difficulty=q.difficulty,
                    )
                    for ans, q in ordered_items
                ],
            )
        else:
            score_attempt(db, latest_attempt)
            raise HTTPException(
                status_code=409,
                detail="Your previous free test time has expired. View your results or create an account to start new tests.",
            )

    # Start new attempt
    attempt, token, questions = start_guest_attempt(
        db,
        free_test.id,
        user_id=user.id if user else None,
        guest_session_token=guest_token,
    )

    return StartAttemptResponse(
        attempt_id=attempt.id,
        test_id=free_test.id,
        test_name=free_test.name,
        guest_token=token,
        expires_at=attempt.expires_at,
        duration_seconds=free_test.duration_seconds,
        total_questions=attempt.total_questions,
        questions=[
            TestQuestionPublic(
                id=q.id,
                position=idx,
                question_text=q.question_text,
                option_a=q.option_a,
                option_b=q.option_b,
                option_c=q.option_c,
                option_d=q.option_d,
                difficulty=q.difficulty,
            )
            for idx, q in enumerate(questions, start=1)
        ],
    )


@router.post("/tests/{test_id}/start", response_model=StartAttemptResponse, status_code=status.HTTP_201_CREATED)
def start_test(
    test_id: UUID,
    response: Response,
    guest_info: tuple[str, bool] = Depends(get_or_create_guest_token),
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> StartAttemptResponse:
    test = db.get(Test, test_id)
    if not test or test.status != TestStatus.PUBLISHED:
        raise HTTPException(status_code=404, detail="Test not found")

    guest_token, is_new = guest_info
    if is_new:
        response.set_cookie(
            key="aa_guest_session",
            value=guest_token,
            max_age=86400 * 60,
            httponly=True,
            samesite="lax",
        )

    # Reconnection / Disconnection Recovery: Check for active in-progress attempt to resume
    active_attempt = None
    if user:
        active_attempt = db.scalar(
            select(TestAttempt)
            .where(
                TestAttempt.test_id == test.id,
                TestAttempt.user_id == user.id,
                TestAttempt.status == AttemptStatus.IN_PROGRESS,
            )
            .order_by(TestAttempt.created_at.desc())
        )
    else:
        token_hash = hash_guest_token(guest_token)
        active_attempt = db.scalar(
            select(TestAttempt)
            .where(
                TestAttempt.test_id == test.id,
                TestAttempt.guest_token_hash == token_hash,
                TestAttempt.status == AttemptStatus.IN_PROGRESS,
            )
            .order_by(TestAttempt.created_at.desc())
        )

    if active_attempt and utc_now() < as_utc(active_attempt.expires_at):
        # Resume existing active test without deducting any new pass
        active_attempt.guest_token_hash = hash_guest_token(guest_token)
        db.commit()

        answers = list(
            db.scalars(
                select(TestAnswer)
                .where(TestAnswer.attempt_id == active_attempt.id)
                .order_by(TestAnswer.position)
            ).all()
        )
        questions_map = {
            q.id: q
            for q in db.scalars(select(Question).where(Question.id.in_([a.question_id for a in answers]))).all()
        }
        ordered_items = [(a, questions_map[a.question_id]) for a in answers if a.question_id in questions_map]

        return StartAttemptResponse(
            attempt_id=active_attempt.id,
            test_id=test.id,
            test_name=test.name,
            guest_token=guest_token,
            expires_at=active_attempt.expires_at,
            duration_seconds=test.duration_seconds,
            total_questions=active_attempt.total_questions,
            questions=[
                TestQuestionPublic(
                    id=q.id,
                    position=ans.position,
                    question_text=q.question_text,
                    option_a=q.option_a,
                    option_b=q.option_b,
                    option_c=q.option_c,
                    option_d=q.option_d,
                    selected_answer=ans.selected_answer,
                    difficulty=q.difficulty,
                )
                for ans, q in ordered_items
            ],
        )

    if not test.is_free:
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Please log in to take premium placement tests.",
            )
        has_access, _ = check_user_test_access(db, user, test)
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Payment required. Please purchase a test pass or subscribe to Pro.",
            )
        consume_user_test_access(db, user, test)

    attempt, token, questions = start_guest_attempt(
        db,
        test_id,
        user_id=user.id if user else None,
        guest_session_token=guest_token,
    )

    return StartAttemptResponse(
        attempt_id=attempt.id,
        test_id=test.id,
        test_name=test.name,
        guest_token=token,
        expires_at=attempt.expires_at,
        duration_seconds=test.duration_seconds,
        total_questions=attempt.total_questions,
        questions=[
            TestQuestionPublic(
                id=q.id,
                position=idx,
                question_text=q.question_text,
                option_a=q.option_a,
                option_b=q.option_b,
                option_c=q.option_c,
                option_d=q.option_d,
                difficulty=q.difficulty,
            )
            for idx, q in enumerate(questions, start=1)
        ],
    )


@router.put("/attempts/{attempt_id}/answers/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def save_answer(
    attempt_id: UUID,
    question_id: UUID,
    payload: AnswerSave,
    db: Session = Depends(get_db),
) -> None:
    attempt = owned_attempt(db, attempt_id, payload.guest_token)
    ensure_active(attempt)
    answer = db.scalar(
        select(TestAnswer).where(
            TestAnswer.attempt_id == attempt.id, TestAnswer.question_id == question_id
        )
    )
    if not answer:
        raise HTTPException(status_code=404, detail="Question not found in this attempt")

    answer.selected_answer = payload.selected_answer
    if payload.time_spent_seconds is not None:
        answer.time_spent_seconds = payload.time_spent_seconds
    db.commit()


@router.post("/attempts/{attempt_id}/submit", response_model=AttemptResult)
def submit_attempt(
    attempt_id: UUID,
    payload: SubmitAttempt,
    db: Session = Depends(get_db),
) -> AttemptResult:
    attempt = owned_attempt(db, attempt_id, payload.guest_token)
    if attempt.status != AttemptStatus.IN_PROGRESS:
        raise HTTPException(status_code=409, detail="Attempt has already been submitted")

    attempt = score_attempt(db, attempt)

    # Mark user free test consumed if applicable
    if attempt.user_id:
        user = db.get(User, attempt.user_id)
        test = db.get(Test, attempt.test_id)
        if user and test and test.is_free:
            user.free_test_consumed = True
            db.commit()

    return result_summary(attempt)


@router.get("/attempts/{attempt_id}/result", response_model=AttemptReview)
def get_attempt_result(
    attempt_id: UUID,
    guest_token: str | None = Query(default=None),
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> AttemptReview:
    attempt = db.get(TestAttempt, attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    if user and attempt.user_id == user.id:
        return review_attempt(db, attempt)

    if guest_token and attempt.guest_token_hash and secrets.compare_digest(attempt.guest_token_hash, hash_guest_token(guest_token)):
        return review_attempt(db, attempt)

    raise HTTPException(status_code=403, detail="Not authorized to view this exam result.")


@router.get("/attempts/{attempt_id}", response_model=StartAttemptResponse)
def get_attempt_for_taking(
    attempt_id: UUID,
    guest_token: str = Query(min_length=20),
    db: Session = Depends(get_db),
) -> StartAttemptResponse:
    attempt = owned_attempt(db, attempt_id, guest_token)
    if attempt.status != AttemptStatus.IN_PROGRESS:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Attempt has already been submitted")

    if utc_now() >= as_utc(attempt.expires_at):
        score_attempt(db, attempt)
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="Test session time has expired. Your attempt was automatically submitted.",
        )

    test = db.get(Test, attempt.test_id)
    answers = list(
        db.scalars(
            select(TestAnswer)
            .where(TestAnswer.attempt_id == attempt.id)
            .order_by(TestAnswer.position)
        ).all()
    )
    questions_map = {
        q.id: q
        for q in db.scalars(select(Question).where(Question.id.in_([a.question_id for a in answers]))).all()
    }
    ordered_items = [(a, questions_map[a.question_id]) for a in answers if a.question_id in questions_map]

    return StartAttemptResponse(
        attempt_id=attempt.id,
        test_id=attempt.test_id,
        test_name=test.name if test else "Aptitude Test",
        guest_token=guest_token,
        expires_at=attempt.expires_at,
        duration_seconds=test.duration_seconds if test else 900,
        total_questions=attempt.total_questions,
        questions=[
            TestQuestionPublic(
                id=q.id,
                position=ans.position,
                question_text=q.question_text,
                option_a=q.option_a,
                option_b=q.option_b,
                option_c=q.option_c,
                option_d=q.option_d,
                selected_answer=ans.selected_answer,
                difficulty=q.difficulty,
            )
            for ans, q in ordered_items
        ],
    )
