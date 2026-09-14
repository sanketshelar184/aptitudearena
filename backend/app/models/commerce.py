from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.base import TimestampMixin, UUIDPrimaryKeyMixin
from app.models.enums import PaymentStatus, ProductType, SubscriptionStatus

if TYPE_CHECKING:
    from app.models.test import Test
    from app.models.user import User


class Product(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "products"

    name: Mapped[str] = mapped_column(String(180), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    product_type: Mapped[ProductType] = mapped_column(Enum(ProductType), nullable=False)
    price_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    question_limit: Mapped[int | None] = mapped_column(Integer)
    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    billing_interval_days: Mapped[int | None] = mapped_column(Integer)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class Payment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "payments"

    user_id = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True, nullable=False)
    product_id = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), index=True, nullable=False)
    provider: Mapped[str] = mapped_column(String(40), default="razorpay", nullable=False)
    provider_order_id: Mapped[str | None] = mapped_column(String(255), unique=True)
    provider_payment_id: Mapped[str | None] = mapped_column(String(255), unique=True)
    provider_signature: Mapped[str | None] = mapped_column(String(255))
    error_reason: Mapped[str | None] = mapped_column(Text)
    amount_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus), default=PaymentStatus.CREATED, nullable=False)

    user: Mapped[User] = relationship(back_populates="payments")
    product: Mapped[Product] = relationship()


class Subscription(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "subscriptions"

    user_id = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), index=True, nullable=False)
    product_id = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), index=True, nullable=False)
    provider: Mapped[str] = mapped_column(String(40), default="razorpay", nullable=False)
    provider_subscription_id: Mapped[str | None] = mapped_column(String(255), unique=True)
    status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus), default=SubscriptionStatus.PENDING, nullable=False
    )
    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship(back_populates="subscriptions")
    product: Mapped[Product] = relationship()


class Entitlement(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "entitlements"

    user_id = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    product_id = mapped_column(ForeignKey("products.id", ondelete="RESTRICT"), index=True, nullable=False)
    payment_id = mapped_column(ForeignKey("payments.id", ondelete="SET NULL"), nullable=True)
    test_id = mapped_column(ForeignKey("tests.id", ondelete="SET NULL"), nullable=True)
    credits_remaining: Mapped[int | None] = mapped_column(Integer, default=1)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship(back_populates="entitlements")
    product: Mapped[Product] = relationship()
    payment: Mapped[Payment | None] = relationship()
    test: Mapped[Test | None] = relationship()
