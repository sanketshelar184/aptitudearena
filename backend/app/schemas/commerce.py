from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.models.enums import PaymentStatus, ProductType, SubscriptionStatus


class ProductBase(BaseModel):
    name: str = Field(min_length=3, max_length=180)
    description: str | None = None
    product_type: ProductType
    price_paise: int = Field(ge=0)
    currency: str = "INR"
    question_limit: int | None = None
    duration_seconds: int | None = None
    billing_interval_days: int | None = None
    is_active: bool = True


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    price_paise: int | None = Field(default=None, ge=0)
    question_limit: int | None = None
    duration_seconds: int | None = None
    billing_interval_days: int | None = None
    is_active: bool | None = None


class ProductRead(ProductBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def price_inr(self) -> int:
        return self.price_paise // 100


class CreateOrderRequest(BaseModel):
    product_id: UUID


class CreateOrderResponse(BaseModel):
    order_id: str
    amount_paise: int
    amount_inr: int
    currency: str
    product_id: UUID
    product_name: str
    product_type: ProductType
    razorpay_key_id: str | None
    is_mock_mode: bool


class VerifyPaymentRequest(BaseModel):
    order_id: str
    payment_id: str
    signature: str


class PaymentVerificationResponse(BaseModel):
    success: bool
    payment_id: UUID
    order_id: str
    status: PaymentStatus
    message: str
    entitlement_id: UUID | None = None
    subscription_id: UUID | None = None


class MembershipStatusResponse(BaseModel):
    user_id: UUID
    email: str
    full_name: str | None
    role: str
    is_subscribed: bool
    subscription_status: SubscriptionStatus | None = None
    subscription_plan: str | None = None
    subscription_end_date: datetime | None = None
    available_test_credits: int = 0
    free_test_consumed: bool = False


class PaymentHistoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    product_name: str
    product_type: ProductType
    amount_inr: int
    currency: str
    status: PaymentStatus
    provider: str
    provider_order_id: str | None
    provider_payment_id: str | None
    created_at: datetime


class UserAttemptHistoryRead(BaseModel):
    id: UUID
    test_id: UUID
    test_name: str
    status: str
    score: int | None
    total_questions: int
    correct_count: int | None
    wrong_count: int | None
    skipped_count: int | None
    accuracy: float | None
    time_taken_seconds: int | None
    started_at: datetime
    submitted_at: datetime | None


class TopicWeakness(BaseModel):
    category_name: str
    topic_name: str
    total_questions: int
    correct_questions: int
    accuracy: float


class StudentDashboardResponse(BaseModel):
    user_name: str
    email: str
    role: str
    is_subscribed: bool
    subscription_plan: str | None = None
    subscription_end_date: datetime | None = None
    available_test_credits: int = 0
    free_test_consumed: bool = False
    tests_completed: int = 0
    questions_attempted: int = 0
    overall_accuracy: float = 0.0
    average_time_per_question_seconds: float = 0.0
    best_score: int | None = None
    best_score_total: int | None = None
    best_accuracy: float | None = None
    streak_days: int = 0
    weak_topics: list[TopicWeakness] = []
    recent_attempts: list[UserAttemptHistoryRead] = []

