from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.api.dependencies.auth import get_current_user, require_admin
from app.db.session import get_db
from app.models.attempt import TestAttempt
from app.models.commerce import Payment, Product
from app.models.test import Test
from app.models.user import User
from app.schemas.commerce import (
    CreateOrderRequest,
    CreateOrderResponse,
    MembershipStatusResponse,
    PaymentHistoryRead,
    PaymentVerificationResponse,
    ProductCreate,
    ProductRead,
    ProductUpdate,
    StudentDashboardResponse,
    UserAttemptHistoryRead,
    VerifyPaymentRequest,
)
from app.services.commerce import (
    calculate_student_dashboard_stats,
    create_order,
    fulfill_payment,
    get_membership_status,
    process_webhook,
)

router = APIRouter(tags=["commerce"])


@router.get("/products", response_model=list[ProductRead])
def list_active_products(db: Session = Depends(get_db)) -> list[ProductRead]:
    products = list(
        db.scalars(
            select(Product)
            .where(Product.is_active.is_(True))
            .order_by(Product.price_paise.asc())
        ).all()
    )
    return [ProductRead.model_validate(p) for p in products]


@router.get("/admin/products", response_model=list[ProductRead], tags=["admin"])
def admin_list_all_products(
    _: object = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[ProductRead]:
    products = list(db.scalars(select(Product).order_by(Product.created_at.desc())).all())
    return [ProductRead.model_validate(p) for p in products]


@router.post(
    "/admin/products",
    response_model=ProductRead,
    status_code=status.HTTP_201_CREATED,
    tags=["admin"],
)
def admin_create_product(
    payload: ProductCreate,
    _: object = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ProductRead:
    if db.scalar(select(Product).where(Product.name == payload.name)):
        raise HTTPException(status_code=409, detail="A product with this name already exists")

    product = Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return ProductRead.model_validate(product)


@router.put("/admin/products/{product_id}", response_model=ProductRead, tags=["admin"])
def admin_update_product(
    product_id: UUID,
    payload: ProductUpdate,
    _: object = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ProductRead:
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    data = payload.model_dump(exclude_unset=True)
    for field, val in data.items():
        setattr(product, field, val)

    db.commit()
    db.refresh(product)
    return ProductRead.model_validate(product)


@router.post("/payments/create-order", response_model=CreateOrderResponse, status_code=status.HTTP_201_CREATED)
def initiate_payment_order(
    payload: CreateOrderRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CreateOrderResponse:
    return create_order(db, user, payload.product_id)


@router.post("/payments/verify", response_model=PaymentVerificationResponse)
def verify_payment_submission(
    payload: VerifyPaymentRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaymentVerificationResponse:
    return fulfill_payment(
        db,
        user=user,
        order_id=payload.order_id,
        payment_id=payload.payment_id,
        signature=payload.signature,
    )


@router.post("/payments/webhook")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> dict:
    body_bytes = await request.body()
    return process_webhook(db, body_bytes, x_razorpay_signature)


@router.get("/users/me/membership", response_model=MembershipStatusResponse)
def get_user_membership(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MembershipStatusResponse:
    return get_membership_status(db, user)


@router.get("/users/me/dashboard", response_model=StudentDashboardResponse)
def get_student_dashboard(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StudentDashboardResponse:
    return calculate_student_dashboard_stats(db, user)


@router.get("/users/me/attempts", response_model=list[UserAttemptHistoryRead])
def get_user_attempts(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[UserAttemptHistoryRead]:
    attempts = list(
        db.scalars(
            select(TestAttempt)
            .where(TestAttempt.user_id == user.id)
            .order_by(desc(TestAttempt.created_at))
        ).all()
    )

    tests_map = {
        t.id: t.name
        for t in db.scalars(select(Test).where(Test.id.in_([a.test_id for a in attempts]))).all()
    }

    results = []
    for a in attempts:
        acc = None
        if a.correct_count is not None and a.total_questions > 0:
            acc = round((a.correct_count / a.total_questions) * 100, 1)

        time_taken = None
        if a.submitted_at and a.started_at:
            time_taken = max(0, int((a.submitted_at - a.started_at).total_seconds()))

        results.append(
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
    return results


@router.get("/users/me/payments", response_model=list[PaymentHistoryRead])
def get_user_payments(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[PaymentHistoryRead]:
    payments = list(
        db.scalars(
            select(Payment)
            .where(Payment.user_id == user.id)
            .order_by(desc(Payment.created_at))
        ).all()
    )

    products_map = {
        p.id: p
        for p in db.scalars(select(Product).where(Product.id.in_([pay.product_id for pay in payments]))).all()
    }

    results = []
    for pay in payments:
        prod = products_map.get(pay.product_id)
        results.append(
            PaymentHistoryRead(
                id=pay.id,
                product_name=prod.name if prod else "Placement Test Access",
                product_type=prod.product_type if prod else "TEST",
                amount_inr=pay.amount_paise // 100,
                currency=pay.currency,
                status=pay.status,
                provider=pay.provider,
                provider_order_id=pay.provider_order_id,
                provider_payment_id=pay.provider_payment_id,
                created_at=pay.created_at,
            )
        )
    return results

