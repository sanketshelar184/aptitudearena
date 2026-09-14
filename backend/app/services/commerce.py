import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.attempt import TestAttempt
from app.models.attempt import TestAnswer, TestAttempt
from app.models.commerce import Entitlement, Payment, Product, Subscription
from app.models.enums import PaymentStatus, ProductType, SubscriptionStatus
from app.models.enums import AttemptStatus, PaymentStatus, ProductType, SubscriptionStatus
from app.models.test import Test
from app.models.user import User
from app.schemas.commerce import (
    CreateOrderResponse,
    MembershipStatusResponse,
    PaymentVerificationResponse,
    StudentDashboardResponse,
    TopicWeakness,
    UserAttemptHistoryRead,
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def is_live_razorpay_configured() -> bool:
    settings = get_settings()
    if settings.razorpay_mock_mode:
        return False
    return bool(settings.razorpay_key_id and settings.razorpay_key_secret)


def create_order(db: Session, user: User, product_id: UUID) -> CreateOrderResponse:
    product = db.get(Product, product_id)
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found or currently unavailable")

    settings = get_settings()
    is_live = is_live_razorpay_configured()

    if is_live:
        try:
            import razorpay  # type: ignore

            client = razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))
            razorpay_order = client.order.create(
                {
                    "amount": product.price_paise,
                    "currency": product.currency,
                    "receipt": f"rcpt_{str(user.id)[:8]}_{int(utc_now().timestamp())}",
                    "notes": {
                        "user_id": str(user.id),
                        "product_id": str(product.id),
                        "product_name": product.name,
                    },
                }
            )
            order_id = razorpay_order["id"]
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=f"Payment gateway error while creating order: {str(exc)}",
            )
    else:
        # Development / Safe Mock Mode
        order_id = f"order_mock_{secrets.token_hex(12)}"

    payment = Payment(
        user_id=user.id,
        product_id=product.id,
        provider="razorpay" if is_live else "mock",
        provider_order_id=order_id,
        amount_paise=product.price_paise,
        currency=product.currency,
        status=PaymentStatus.CREATED,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    return CreateOrderResponse(
        order_id=order_id,
        amount_paise=product.price_paise,
        amount_inr=product.price_paise // 100,
        currency=product.currency,
        product_id=product.id,
        product_name=product.name,
        product_type=product.product_type,
        razorpay_key_id=settings.razorpay_key_id if is_live else "rzp_mock_key",
        is_mock_mode=not is_live,
    )


def verify_payment_signature(
    order_id: str,
    payment_id: str,
    signature: str,
    is_live: bool,
    secret: str | None,
) -> bool:
    if not is_live:
        # Mock mode allows "mock_signature_approved" or any mock signature without "fail"
        if "fail" in signature.lower() or "rejected" in signature.lower():
            return False
        return True

    if not secret:
        return False

    message = f"{order_id}|{payment_id}".encode("utf-8")
    generated_signature = hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()
    return hmac.compare_digest(generated_signature, signature)


def fulfill_payment(
    db: Session,
    user: User,
    order_id: str,
    payment_id: str,
    signature: str,
) -> PaymentVerificationResponse:
    payment = db.scalar(
        select(Payment).where(
            Payment.provider_order_id == order_id,
            Payment.user_id == user.id,
        )
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Payment order not found for this user")

    # Idempotency: if already PAID, return successful status without duplicating entitlements
    if payment.status == PaymentStatus.PAID:
        entitlement = db.scalar(select(Entitlement).where(Entitlement.payment_id == payment.id))
        sub = db.scalar(
            select(Subscription).where(
                Subscription.user_id == user.id,
                Subscription.product_id == payment.product_id,
            )
        )
        return PaymentVerificationResponse(
            success=True,
            payment_id=payment.id,
            order_id=order_id,
            status=PaymentStatus.PAID,
            message="Payment already verified and fulfilled.",
            entitlement_id=entitlement.id if entitlement else None,
            subscription_id=sub.id if sub else None,
        )

    settings = get_settings()
    is_live = payment.provider == "razorpay" and not settings.razorpay_mock_mode
    is_valid = verify_payment_signature(
        order_id=order_id,
        payment_id=payment_id,
        signature=signature,
        is_live=is_live,
        secret=settings.razorpay_key_secret,
    )

    if not is_valid:
        payment.status = PaymentStatus.FAILED
        payment.error_reason = "Signature verification failed"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment verification failed. Invalid gateway signature.",
        )

    # Valid signature: mark PAID
    payment.status = PaymentStatus.PAID
    payment.provider_payment_id = payment_id
    payment.provider_signature = signature

    product = db.get(Product, payment.product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Associated product not found")

    entitlement_id: UUID | None = None
    subscription_id: UUID | None = None

    if product.product_type == ProductType.SUBSCRIPTION:
        interval_days = product.billing_interval_days or 30
        existing_sub = db.scalar(
            select(Subscription)
            .where(
                Subscription.user_id == user.id,
                Subscription.product_id == product.id,
            )
            .order_by(Subscription.end_date.desc())
        )

        now = utc_now()
        if existing_sub and existing_sub.end_date and as_utc(existing_sub.end_date) > now:
            # Extend existing active subscription
            existing_sub.end_date = as_utc(existing_sub.end_date) + timedelta(days=interval_days)
            existing_sub.status = SubscriptionStatus.ACTIVE
            subscription_id = existing_sub.id
        else:
            new_sub = Subscription(
                user_id=user.id,
                product_id=product.id,
                provider=payment.provider,
                provider_subscription_id=payment_id,
                status=SubscriptionStatus.ACTIVE,
                start_date=now,
                end_date=now + timedelta(days=interval_days),
            )
            db.add(new_sub)
            db.flush()
            subscription_id = new_sub.id
    else:
        # ProductType.TEST
        new_entitlement = Entitlement(
            user_id=user.id,
            product_id=product.id,
            payment_id=payment.id,
            test_id=None,  # Generic test pass
            credits_remaining=1,
            is_active=True,
            expires_at=None,
        )
        db.add(new_entitlement)
        db.flush()
        entitlement_id = new_entitlement.id

    db.commit()
    db.refresh(payment)

    return PaymentVerificationResponse(
        success=True,
        payment_id=payment.id,
        order_id=order_id,
        status=PaymentStatus.PAID,
        message="Payment verified successfully. Your access is now active.",
        entitlement_id=entitlement_id,
        subscription_id=subscription_id,
    )


def process_webhook(db: Session, body_bytes: bytes, signature: str | None) -> dict:
    settings = get_settings()
    if settings.razorpay_webhook_secret and signature:
        expected = hmac.new(
            settings.razorpay_webhook_secret.encode("utf-8"), body_bytes, hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(expected, signature):
            raise HTTPException(status_code=400, detail="Invalid webhook signature")

    payload = json.loads(body_bytes.decode("utf-8"))
    event = payload.get("event")

    if event in {"order.paid", "payment.captured"}:
        entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        order_id = entity.get("order_id")
        payment_id = entity.get("id")

        if order_id:
            payment = db.scalar(select(Payment).where(Payment.provider_order_id == order_id))
            if payment and payment.status != PaymentStatus.PAID:
                user = db.get(User, payment.user_id)
                if user:
                    fulfill_payment(
                        db,
                        user=user,
                        order_id=order_id,
                        payment_id=payment_id or f"pay_wh_{secrets.token_hex(8)}",
                        signature="webhook_verified",
                    )

    return {"status": "ok", "event": event}


def check_user_test_access(db: Session, user: User, test: Test) -> tuple[bool, str]:
    if test.is_free:
        return True, "FREE_TEST"

    now = utc_now()

    # 1. Check if user has an active Pro Subscription
    active_sub = db.scalar(
        select(Subscription).where(
            Subscription.user_id == user.id,
            Subscription.status == SubscriptionStatus.ACTIVE,
            (Subscription.end_date.is_(None) | (Subscription.end_date > now)),
        )
    )
    if active_sub:
        return True, "PRO_SUBSCRIPTION"

    # 2. Check if user has an available test entitlement
    # Either for this specific test or generic test pass
    entitlement = db.scalar(
        select(Entitlement).where(
            Entitlement.user_id == user.id,
            Entitlement.is_active.is_(True),
            (Entitlement.credits_remaining.is_(None) | (Entitlement.credits_remaining > 0)),
            (Entitlement.expires_at.is_(None) | (Entitlement.expires_at > now)),
            (Entitlement.test_id == test.id) | (Entitlement.test_id.is_(None)),
        )
    )
    if entitlement:
        return True, "TEST_ENTITLEMENT"

    return False, "PAYMENT_REQUIRED"


def consume_user_test_access(db: Session, user: User, test: Test) -> None:
    if test.is_free:
        return

    now = utc_now()
    active_sub = db.scalar(
        select(Subscription).where(
            Subscription.user_id == user.id,
            Subscription.status == SubscriptionStatus.ACTIVE,
            (Subscription.end_date.is_(None) | (Subscription.end_date > now)),
        )
    )
    if active_sub:
        # Subscribers have unlimited access, do not consume credits
        return

    # Consume single entitlement credit
    entitlement = db.scalar(
        select(Entitlement).where(
            Entitlement.user_id == user.id,
            Entitlement.is_active.is_(True),
            (Entitlement.credits_remaining.is_(None) | (Entitlement.credits_remaining > 0)),
            (Entitlement.expires_at.is_(None) | (Entitlement.expires_at > now)),
            (Entitlement.test_id == test.id) | (Entitlement.test_id.is_(None)),
        )
    )
    if entitlement and entitlement.credits_remaining is not None:
        entitlement.credits_remaining -= 1
        if entitlement.credits_remaining <= 0:
            entitlement.is_active = False
        db.commit()


def get_membership_status(db: Session, user: User) -> MembershipStatusResponse:
    now = utc_now()
    active_sub = db.scalar(
        select(Subscription).where(
            Subscription.user_id == user.id,
            Subscription.status == SubscriptionStatus.ACTIVE,
            (Subscription.end_date.is_(None) | (Subscription.end_date > now)),
        )
    )

    # Calculate remaining test credits
    active_credits = (
        db.scalar(
            select(func.coalesce(func.sum(Entitlement.credits_remaining), 0)).where(
                Entitlement.user_id == user.id,
                Entitlement.is_active.is_(True),
                (Entitlement.expires_at.is_(None) | (Entitlement.expires_at > now)),
            )
        )
        or 0
    )

    plan_name = None
    if active_sub:
        product = db.get(Product, active_sub.product_id)
        plan_name = product.name if product else "Monthly Pro"

    return MembershipStatusResponse(
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
        is_subscribed=bool(active_sub),
        subscription_status=active_sub.status if active_sub else None,
        subscription_plan=plan_name,
        subscription_end_date=active_sub.end_date if active_sub else None,
        available_test_credits=active_credits,
        free_test_consumed=user.free_test_consumed,
    )


def calculate_student_dashboard_stats(db: Session, user: User) -> StudentDashboardResponse:
    membership = get_membership_status(db, user)

    # 1. Fetch user's attempts
    attempts = list(
        db.scalars(
            select(TestAttempt)
            .where(TestAttempt.user_id == user.id)
            .order_by(TestAttempt.created_at.desc())
        ).all()
    )

    tests_map = (
        {
            t.id: t.name
            for t in db.scalars(select(Test).where(Test.id.in_([a.test_id for a in attempts]))).all()
        }
        if attempts
        else {}
    )

    submitted_attempts = [a for a in attempts if a.status == AttemptStatus.SUBMITTED]
    tests_completed = len(submitted_attempts)

    # Questions attempted, accuracy, timing
    total_questions_attempted = sum(a.total_questions for a in submitted_attempts)
    total_correct = sum(a.correct_count or 0 for a in submitted_attempts)
    overall_accuracy = (
        round((total_correct / total_questions_attempted * 100), 1)
        if total_questions_attempted > 0
        else 0.0
    )

    total_time_seconds = 0
    for a in submitted_attempts:
        if a.submitted_at and a.started_at:
            total_time_seconds += max(0, int((a.submitted_at - a.started_at).total_seconds()))

    avg_time_per_q = (
        round(total_time_seconds / total_questions_attempted, 1)
        if total_questions_attempted > 0
        else 0.0
    )

    # Best score
    best_score = None
    best_score_total = None
    best_accuracy = None
    for a in submitted_attempts:
        if a.score is not None:
            if best_score is None or a.score > best_score:
                best_score = a.score
                best_score_total = a.total_questions
        if a.correct_count is not None and a.total_questions > 0:
            acc = round((a.correct_count / a.total_questions) * 100, 1)
            if best_accuracy is None or acc > best_accuracy:
                best_accuracy = acc

    # Streak calculation: consecutive unique days
    streak_days = 0
    if submitted_attempts:
        dates = sorted(
            {a.submitted_at.date() for a in submitted_attempts if a.submitted_at},
            reverse=True,
        )
        today = utc_now().date()
        yesterday = today - timedelta(days=1)
        if dates and (dates[0] == today or dates[0] == yesterday):
            current_check = dates[0]
            for d in dates:
                if d == current_check:
                    streak_days += 1
                    current_check -= timedelta(days=1)
                else:
                    break

    # 2. Topic performance / weakness
    weak_topics: list[TopicWeakness] = []
    submitted_attempt_ids = [a.id for a in submitted_attempts]
    if submitted_attempt_ids:
        from app.models.question import Question
        from app.models.taxonomy import Category, Topic

        answers = list(
            db.scalars(
                select(TestAnswer).where(TestAnswer.attempt_id.in_(submitted_attempt_ids))
            ).all()
        )
        if answers:
            q_ids = [ans.question_id for ans in answers]
            questions = {
                q.id: q
                for q in db.scalars(select(Question).where(Question.id.in_(q_ids))).all()
            }
            topic_ids = {q.topic_id for q in questions.values() if q.topic_id}
            topics = {
                t.id: t
                for t in db.scalars(select(Topic).where(Topic.id.in_(topic_ids))).all()
            }
            category_ids = {t.category_id for t in topics.values()}
            categories = {
                c.id: c.name
                for c in db.scalars(select(Category).where(Category.id.in_(category_ids))).all()
            }

            topic_stats: dict[UUID, dict] = {}
            for ans in answers:
                q = questions.get(ans.question_id)
                if not q or not q.topic_id:
                    continue
                tid = q.topic_id
                if tid not in topic_stats:
                    topic_obj = topics.get(tid)
                    topic_name = topic_obj.name if topic_obj else "General"
                    cat_name = (
                        categories.get(topic_obj.category_id, "Aptitude")
                        if topic_obj
                        else "Aptitude"
                    )
                    topic_stats[tid] = {
                        "category_name": cat_name,
                        "topic_name": topic_name,
                        "total": 0,
                        "correct": 0,
                    }
                topic_stats[tid]["total"] += 1
                if ans.is_correct:
                    topic_stats[tid]["correct"] += 1

            for s in topic_stats.values():
                if s["total"] >= 1:
                    acc = round((s["correct"] / s["total"]) * 100, 1)
                    if acc < 70.0:  # weak if below 70%
                        weak_topics.append(
                            TopicWeakness(
                                category_name=s["category_name"],
                                topic_name=s["topic_name"],
                                total_questions=s["total"],
                                correct_questions=s["correct"],
                                accuracy=acc,
                            )
                        )
            weak_topics.sort(key=lambda x: x.accuracy)
            weak_topics = weak_topics[:5]

    # Recent attempts formatted
    recent_attempts: list[UserAttemptHistoryRead] = []
    for a in attempts[:10]:
        acc = None
        if a.correct_count is not None and a.total_questions > 0:
            acc = round((a.correct_count / a.total_questions) * 100, 1)
        time_taken = None
        if a.submitted_at and a.started_at:
            time_taken = max(0, int((a.submitted_at - a.started_at).total_seconds()))

        recent_attempts.append(
            UserAttemptHistoryRead(
                id=a.id,
                test_id=a.test_id,
                test_name=tests_map.get(a.test_id, "Placement Test"),
                status=a.status.value,
                score=a.score,
                total_questions=a.total_questions,
                correct_count=a.correct_count,
                wrong_count=a.wrong_count,
                skipped_count=a.skipped_count,
                accuracy=acc,
                time_taken_seconds=time_taken,
                started_at=a.started_at,
                submitted_at=a.submitted_at,
            )
        )

    return StudentDashboardResponse(
        user_name=user.full_name or user.email.split("@")[0].capitalize(),
        email=user.email,
        role=user.role.value,
        is_subscribed=membership.is_subscribed,
        subscription_plan=membership.subscription_plan,
        subscription_end_date=membership.subscription_end_date,
        available_test_credits=membership.available_test_credits,
        free_test_consumed=membership.free_test_consumed,
        tests_completed=tests_completed,
        questions_attempted=total_questions_attempted,
        overall_accuracy=overall_accuracy,
        average_time_per_question_seconds=avg_time_per_q,
        best_score=best_score,
        best_score_total=best_score_total,
        best_accuracy=best_accuracy,
        streak_days=streak_days,
        weak_topics=weak_topics,
        recent_attempts=recent_attempts,
    )

