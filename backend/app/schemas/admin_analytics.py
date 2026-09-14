from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.models.enums import PaymentStatus


class RecentRegistration(BaseModel):
    id: UUID
    email: str
    full_name: str | None = None
    role: str
    is_active: bool
    created_at: datetime


class RecentPayment(BaseModel):
    id: UUID
    user_email: str
    amount_inr: int
    status: PaymentStatus
    product_name: str
    created_at: datetime


class PopularTest(BaseModel):
    test_id: UUID
    test_name: str
    attempt_count: int
    average_accuracy: float


class AdminAnalyticsResponse(BaseModel):
    total_users: int
    total_tests_taken: int
    total_questions_in_bank: int
    total_revenue_inr: int
    paid_purchases_count: int
    active_subscriptions_count: int
    recent_registrations: list[RecentRegistration]
    recent_payments: list[RecentPayment]
    popular_tests: list[PopularTest]

