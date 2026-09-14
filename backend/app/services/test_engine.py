import hashlib
import random
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.attempt import TestAnswer, TestAttempt
from app.models.enums import AttemptStatus, TestStatus
from app.models.question import Question
from app.models.taxonomy import Category, Topic
from app.models.test import Test, TestQuestion
from app.schemas.test_engine import (
    AnswerReview,
    AttemptResult,
    AttemptReview,
    SpeedPerformance,
    TopicPerformance,
)


def utc_now() -> datetime:
    return datetime.now(UTC)


def as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


def hash_guest_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def get_recent_question_ids(db: Session, user_id: UUID | None, guest_token_hash: str | None) -> set[UUID]:
    """Get question IDs answered by this user/guest in recent attempts to reduce repetition."""
    since = utc_now() - timedelta(days=7)
    query = select(TestAnswer.question_id).join(TestAttempt).where(TestAttempt.created_at >= since)
    if user_id:
        query = query.where(TestAttempt.user_id == user_id)
    elif guest_token_hash:
        query = query.where(TestAttempt.guest_token_hash == guest_token_hash)
    else:
        return set()
    return set(db.scalars(query).all())


def selected_questions(
    db: Session,
    test: Test,
    exclude_question_ids: set[UUID] | None = None,
) -> list[Question]:
    # 1. Fixed questions if assigned via TestQuestion
    fixed = list(
        db.scalars(
            select(Question)
            .join(TestQuestion, Question.id == TestQuestion.question_id)
            .where(TestQuestion.test_id == test.id)
            .order_by(TestQuestion.position)
        ).all()
    )
    if fixed:
        if len(fixed) < test.question_count:
            raise HTTPException(status_code=409, detail="Test has fewer configured questions than required")
        return fixed[: test.question_count]

    # 2. Dynamic Selection
    base_filter = [Question.is_active.is_(True)]
    if not test.is_premium:
        base_filter.append(Question.is_premium.is_(False))

    exclude = exclude_question_ids or set()

    # Case A: Topic Test
    if test.category_id and test.topic_id:
        query = select(Question).where(
            *base_filter,
            Question.category_id == test.category_id,
            Question.topic_id == test.topic_id,
        )
        if test.difficulty:
            diff_eligible = list(db.scalars(query.where(Question.difficulty == test.difficulty)).all())
            eligible = diff_eligible if len(diff_eligible) >= test.question_count else list(db.scalars(query).all())
        else:
            eligible = list(db.scalars(query).all())

        filtered = [q for q in eligible if q.id not in exclude]
        pool = filtered if len(filtered) >= test.question_count else eligible

        if len(pool) < test.question_count:
            raise HTTPException(
                status_code=409,
                detail="Not enough eligible questions available for this topic test.",
            )
        return random.sample(pool, test.question_count)

    # Case B: Category Test
    if test.category_id:
        query = select(Question).where(*base_filter, Question.category_id == test.category_id)
        if test.difficulty:
            diff_eligible = list(db.scalars(query.where(Question.difficulty == test.difficulty)).all())
            eligible = diff_eligible if len(diff_eligible) >= test.question_count else list(db.scalars(query).all())
        else:
            eligible = list(db.scalars(query).all())

        filtered = [q for q in eligible if q.id not in exclude]
        pool = filtered if len(filtered) >= test.question_count else eligible

        if len(pool) < test.question_count:
            raise HTTPException(
                status_code=409,
                detail="Not enough eligible questions available for this category test.",
            )
        return random.sample(pool, test.question_count)

    # Case C: Mixed Test (select evenly across active categories)
    categories = list(db.scalars(select(Category).order_by(Category.name)).all())
    selected: list[Question] = []
    seen_ids: set[UUID] = set()

    if categories:
        target_per_category = test.question_count // len(categories)
        remainder = test.question_count % len(categories)

        for i, cat in enumerate(categories):
            quota = target_per_category + (1 if i < remainder else 0)
            if quota <= 0:
                continue

            cat_query = select(Question).where(*base_filter, Question.category_id == cat.id)
            if test.difficulty:
                diff_eligible = list(db.scalars(cat_query.where(Question.difficulty == test.difficulty)).all())
                cat_eligible = diff_eligible if len(diff_eligible) >= quota else list(db.scalars(cat_query).all())
            else:
                cat_eligible = list(db.scalars(cat_query).all())
            cat_filtered = [q for q in cat_eligible if q.id not in exclude]
            cat_pool = cat_filtered if len(cat_filtered) >= quota else cat_eligible

            sample_size = min(len(cat_pool), quota)
            sampled = random.sample(cat_pool, sample_size)
            for q in sampled:
                if q.id not in seen_ids:
                    selected.append(q)
                    seen_ids.add(q.id)

    # If shortfall from any category, fill from any remaining active questions
    if len(selected) < test.question_count:
        fallback_query = select(Question).where(*base_filter)
        if test.difficulty:
            fallback_query = fallback_query.where(Question.difficulty == test.difficulty)
        fallback_eligible = [q for q in db.scalars(fallback_query).all() if q.id not in seen_ids]
        shortfall = test.question_count - len(selected)
        if len(fallback_eligible) < shortfall:
            raise HTTPException(
                status_code=409,
                detail=f"Not enough eligible questions in the question bank (found {len(selected) + len(fallback_eligible)}, needed {test.question_count}).",
            )
        selected.extend(random.sample(fallback_eligible, shortfall))

    random.shuffle(selected)
    return selected[: test.question_count]


def start_guest_attempt(
    db: Session,
    test_id: UUID,
    user_id: UUID | None = None,
    guest_session_token: str | None = None,
) -> tuple[TestAttempt, str, list[Question]]:
    test = db.get(Test, test_id)
    if not test or test.status != TestStatus.PUBLISHED:
        raise HTTPException(status_code=404, detail="Test not found")

    recent_ids = get_recent_question_ids(db, user_id, hash_guest_token(guest_session_token) if guest_session_token else None)
    questions = selected_questions(db, test, exclude_question_ids=recent_ids)

    token = guest_session_token or secrets.token_urlsafe(32)
    now = utc_now()
    expires_at = now + timedelta(seconds=test.duration_seconds)

    attempt = TestAttempt(
        user_id=user_id,
        test_id=test.id,
        guest_token_hash=hash_guest_token(token),
        status=AttemptStatus.IN_PROGRESS,
        started_at=now,
        expires_at=expires_at,
        total_questions=len(questions),
    )
    db.add(attempt)
    db.flush()

    db.add_all(
        [
            TestAnswer(attempt_id=attempt.id, question_id=q.id, position=idx)
            for idx, q in enumerate(questions, start=1)
        ]
    )
    db.commit()
    db.refresh(attempt)
    return attempt, token, questions


def owned_attempt(db: Session, attempt_id: UUID, guest_token: str) -> TestAttempt:
    attempt = db.get(TestAttempt, attempt_id)
    if not attempt or not secrets.compare_digest(attempt.guest_token_hash or "", hash_guest_token(guest_token)):
        raise HTTPException(status_code=404, detail="Attempt not found or access token invalid")
    return attempt


def ensure_active(attempt: TestAttempt) -> None:
    if attempt.status != AttemptStatus.IN_PROGRESS:
        raise HTTPException(status_code=409, detail="Attempt has already been submitted")
    if utc_now() >= as_utc(attempt.expires_at):
        raise HTTPException(status_code=409, detail="Test time has expired; submit to see your result")


def score_attempt(db: Session, attempt: TestAttempt) -> TestAttempt:
    answers = list(
        db.scalars(
            select(TestAnswer).where(TestAnswer.attempt_id == attempt.id).order_by(TestAnswer.position)
        ).all()
    )
    question_ids = [a.question_id for a in answers]
    questions = {
        q.id: q
        for q in db.scalars(select(Question).where(Question.id.in_(question_ids))).all()
    }

    test = db.get(Test, attempt.test_id)
    negative_ratio = getattr(test, "negative_marking_ratio", 0.0) if test else 0.0

    correct = wrong = skipped = 0
    for answer in answers:
        q = questions.get(answer.question_id)
        if not q:
            continue
        selected = answer.selected_answer
        if not selected:
            skipped += 1
            answer.is_correct = None
        elif selected == q.correct_answer:
            correct += 1
            answer.is_correct = True
        else:
            wrong += 1
            answer.is_correct = False

    raw_score = correct - (wrong * negative_ratio)
    attempt.correct_count = correct
    attempt.wrong_count = wrong
    attempt.skipped_count = skipped
    attempt.score = max(0, int(round(raw_score)))

    is_time_expired = utc_now() >= as_utc(attempt.expires_at)
    attempt.status = AttemptStatus.EXPIRED if is_time_expired else AttemptStatus.SUBMITTED
    attempt.submitted_at = utc_now()

    db.commit()
    db.refresh(attempt)
    return attempt


def result_summary(attempt: TestAttempt) -> AttemptResult:
    duration = (
        max(0, int((as_utc(attempt.submitted_at) - as_utc(attempt.started_at)).total_seconds()))
        if attempt.submitted_at
        else 0
    )
    total = attempt.total_questions
    correct = attempt.correct_count or 0

    return AttemptResult(
        attempt_id=attempt.id,
        test_id=attempt.test_id,
        status=attempt.status,
        total_questions=total,
        correct_count=correct,
        wrong_count=attempt.wrong_count or 0,
        skipped_count=attempt.skipped_count or 0,
        score=attempt.score or 0,
        accuracy=round((correct / total) * 100, 1) if total else 0.0,
        time_taken_seconds=duration,
        average_time_seconds=round(duration / total, 1) if total else 0.0,
    )


def review_attempt(db: Session, attempt: TestAttempt) -> AttemptReview:
    if attempt.status == AttemptStatus.IN_PROGRESS:
        raise HTTPException(status_code=409, detail="Submit the attempt before reviewing answers")

    rows = db.execute(
        select(TestAnswer, Question, Topic, Category)
        .join(Question, TestAnswer.question_id == Question.id)
        .join(Topic, Question.topic_id == Topic.id)
        .join(Category, Question.category_id == Category.id)
        .where(TestAnswer.attempt_id == attempt.id)
        .order_by(TestAnswer.position)
    ).all()

    grouped: dict[tuple[str, str], list[bool | None]] = {}
    answers: list[AnswerReview] = []

    for answer, question, topic, category in rows:
        grouped.setdefault((category.name, topic.name), []).append(answer.is_correct)
        answers.append(
            AnswerReview(
                position=answer.position,
                question_id=question.id,
                question_text=question.question_text,
                options={
                    "A": question.option_a,
                    "B": question.option_b,
                    "C": question.option_c,
                    "D": question.option_d,
                },
                selected_answer=answer.selected_answer,
                correct_answer=question.correct_answer,
                is_correct=answer.is_correct,
                explanation=question.explanation,
            )
        )

    performance = [
        TopicPerformance(
            category=cat_name,
            topic=top_name,
            total=len(outcomes),
            correct=sum(val is True for val in outcomes),
            accuracy=round((sum(val is True for val in outcomes) / len(outcomes)) * 100, 1),
        )
        for (cat_name, top_name), outcomes in grouped.items()
    ]
    performance.sort(key=lambda item: (item.accuracy, -item.total, item.topic))

    summary = result_summary(attempt)

    # Speed assessment
    avg_sec = summary.average_time_seconds
    if avg_sec < 35:
        pace = "FAST"
    elif avg_sec <= 55:
        pace = "OPTIMAL"
    else:
        pace = "SLOW"

    speed = SpeedPerformance(
        average_seconds_per_question=avg_sec,
        benchmark_seconds_per_question=45.0,
        pace_status=pace,
    )

    return AttemptReview(
        **summary.model_dump(),
        topic_performance=performance,
        weakest_topic=performance[0].topic if performance else None,
        speed_performance=speed,
        answers=answers,
    )
