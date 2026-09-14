"""Create core platform tables.

Revision ID: 0001_core_platform
Revises:
Create Date: 2026-09-06
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0001_core_platform"
down_revision: str | None = None
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def uuid_column(name: str = "id", **kwargs: object) -> sa.Column[object]:
    return sa.Column(name, sa.Uuid(), **kwargs)


def timestamps() -> list[sa.Column[object]]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    ]


def upgrade() -> None:
    user_role = sa.Enum("USER", "ADMIN", name="userrole")
    difficulty = sa.Enum("EASY", "MEDIUM", "HARD", name="difficulty")
    test_status = sa.Enum("DRAFT", "PUBLISHED", "ARCHIVED", name="teststatus")
    attempt_status = sa.Enum("IN_PROGRESS", "SUBMITTED", "EXPIRED", name="attemptstatus")
    product_type = sa.Enum("TEST", "SUBSCRIPTION", name="producttype")
    payment_status = sa.Enum("CREATED", "PAID", "FAILED", "REFUNDED", name="paymentstatus")
    subscription_status = sa.Enum("PENDING", "ACTIVE", "CANCELLED", "EXPIRED", name="subscriptionstatus")

    op.create_table(
        "categories", uuid_column(primary_key=True), sa.Column("name", sa.String(120), nullable=False),
        sa.Column("slug", sa.String(140), nullable=False), *timestamps(),
        sa.UniqueConstraint("name"), sa.UniqueConstraint("slug"),
    )
    op.create_table(
        "products", uuid_column(primary_key=True), sa.Column("name", sa.String(180), nullable=False),
        sa.Column("product_type", product_type, nullable=False), sa.Column("price_paise", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="INR"), sa.Column("question_limit", sa.Integer()),
        sa.Column("duration_seconds", sa.Integer()), sa.Column("billing_interval_days", sa.Integer()),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()), *timestamps(), sa.UniqueConstraint("name"),
    )
    op.create_table(
        "users", uuid_column(primary_key=True), sa.Column("email", sa.String(320), nullable=False),
        sa.Column("password_hash", sa.String(255)), sa.Column("full_name", sa.String(120)),
        sa.Column("role", user_role, nullable=False, server_default="USER"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("free_test_consumed", sa.Boolean(), nullable=False, server_default=sa.false()), *timestamps(), sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_table(
        "topics", uuid_column(primary_key=True), uuid_column("category_id", nullable=False), sa.Column("name", sa.String(120), nullable=False),
        sa.Column("slug", sa.String(140), nullable=False), *timestamps(),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"], ondelete="CASCADE"), sa.UniqueConstraint("category_id", "name", name="uq_topics_category_name"),
    )
    op.create_index("ix_topics_category_id", "topics", ["category_id"])
    op.create_table(
        "questions", uuid_column(primary_key=True), sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("option_a", sa.Text(), nullable=False), sa.Column("option_b", sa.Text(), nullable=False),
        sa.Column("option_c", sa.Text(), nullable=False), sa.Column("option_d", sa.Text(), nullable=False),
        sa.Column("correct_answer", sa.String(1), nullable=False), sa.Column("explanation", sa.Text(), nullable=False),
        uuid_column("category_id", nullable=False), uuid_column("topic_id", nullable=False), sa.Column("difficulty", difficulty, nullable=False),
        sa.Column("estimated_time_seconds", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("is_premium", sa.Boolean(), nullable=False, server_default=sa.false()), sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("source", sa.String(255)), *timestamps(),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"], ondelete="RESTRICT"), sa.ForeignKeyConstraint(["topic_id"], ["topics.id"], ondelete="RESTRICT"),
    )
    for name, columns in [("ix_questions_category_id", ["category_id"]), ("ix_questions_topic_id", ["topic_id"]), ("ix_questions_difficulty", ["difficulty"]), ("ix_questions_is_active", ["is_active"]), ("ix_questions_active_category_difficulty", ["is_active", "category_id", "difficulty"])]:
        op.create_index(name, "questions", columns)
    op.create_table(
        "tests", uuid_column(primary_key=True), sa.Column("name", sa.String(180), nullable=False), sa.Column("description", sa.Text()),
        sa.Column("question_count", sa.Integer(), nullable=False), sa.Column("duration_seconds", sa.Integer(), nullable=False),
        uuid_column("category_id"), uuid_column("topic_id"), sa.Column("difficulty", difficulty),
        sa.Column("is_free", sa.Boolean(), nullable=False, server_default=sa.false()), sa.Column("is_premium", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("status", test_status, nullable=False, server_default="DRAFT"), *timestamps(), sa.UniqueConstraint("name"),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"], ondelete="SET NULL"), sa.ForeignKeyConstraint(["topic_id"], ["topics.id"], ondelete="SET NULL"),
    )
    op.create_table(
        "payments", uuid_column(primary_key=True), uuid_column("user_id", nullable=False), uuid_column("product_id", nullable=False),
        sa.Column("provider", sa.String(40), nullable=False, server_default="razorpay"), sa.Column("provider_order_id", sa.String(255)),
        sa.Column("provider_payment_id", sa.String(255)), sa.Column("amount_paise", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="INR"), sa.Column("status", payment_status, nullable=False, server_default="CREATED"), *timestamps(),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="RESTRICT"), sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="RESTRICT"),
        sa.UniqueConstraint("provider_order_id"), sa.UniqueConstraint("provider_payment_id"),
    )
    op.create_index("ix_payments_user_id", "payments", ["user_id"]); op.create_index("ix_payments_product_id", "payments", ["product_id"])
    op.create_table(
        "subscriptions", uuid_column(primary_key=True), uuid_column("user_id", nullable=False), uuid_column("product_id", nullable=False),
        sa.Column("provider", sa.String(40), nullable=False, server_default="razorpay"), sa.Column("provider_subscription_id", sa.String(255)),
        sa.Column("status", subscription_status, nullable=False, server_default="PENDING"), sa.Column("start_date", sa.DateTime(timezone=True)), sa.Column("end_date", sa.DateTime(timezone=True)), *timestamps(),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="RESTRICT"), sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="RESTRICT"), sa.UniqueConstraint("provider_subscription_id"),
    )
    op.create_index("ix_subscriptions_user_id", "subscriptions", ["user_id"]); op.create_index("ix_subscriptions_product_id", "subscriptions", ["product_id"])
    op.create_table(
        "test_questions", uuid_column(primary_key=True), uuid_column("test_id", nullable=False), uuid_column("question_id", nullable=False), sa.Column("position", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["test_id"], ["tests.id"], ondelete="CASCADE"), sa.ForeignKeyConstraint(["question_id"], ["questions.id"], ondelete="RESTRICT"), sa.UniqueConstraint("test_id", "question_id", name="uq_test_questions_test_question"),
    )
    op.create_index("ix_test_questions_test_id", "test_questions", ["test_id"]); op.create_index("ix_test_questions_question_id", "test_questions", ["question_id"])
    op.create_table(
        "test_attempts", uuid_column(primary_key=True), uuid_column("user_id"), uuid_column("test_id", nullable=False), sa.Column("guest_token_hash", sa.String(255)),
        sa.Column("status", attempt_status, nullable=False, server_default="IN_PROGRESS"), sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False), sa.Column("submitted_at", sa.DateTime(timezone=True)), sa.Column("total_questions", sa.Integer(), nullable=False),
        sa.Column("correct_count", sa.Integer()), sa.Column("wrong_count", sa.Integer()), sa.Column("skipped_count", sa.Integer()), sa.Column("score", sa.Integer()), *timestamps(),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"), sa.ForeignKeyConstraint(["test_id"], ["tests.id"], ondelete="RESTRICT"),
    )
    for name, columns in [("ix_test_attempts_user_id", ["user_id"]), ("ix_test_attempts_test_id", ["test_id"]), ("ix_test_attempts_guest_token_hash", ["guest_token_hash"]), ("ix_attempts_user_created", ["user_id", "created_at"])]:
        op.create_index(name, "test_attempts", columns)
    op.create_table(
        "test_answers", uuid_column(primary_key=True), uuid_column("attempt_id", nullable=False), uuid_column("question_id", nullable=False),
        sa.Column("selected_answer", sa.String(1)), sa.Column("is_correct", sa.Boolean()), sa.Column("time_spent_seconds", sa.Integer()), *timestamps(),
        sa.ForeignKeyConstraint(["attempt_id"], ["test_attempts.id"], ondelete="CASCADE"), sa.ForeignKeyConstraint(["question_id"], ["questions.id"], ondelete="RESTRICT"), sa.UniqueConstraint("attempt_id", "question_id", name="uq_test_answers_attempt_question"),
    )
    op.create_index("ix_test_answers_attempt_id", "test_answers", ["attempt_id"]); op.create_index("ix_test_answers_question_id", "test_answers", ["question_id"])


def downgrade() -> None:
    for table in ["test_answers", "test_attempts", "test_questions", "subscriptions", "payments", "tests", "questions", "topics", "users", "products", "categories"]:
        op.drop_table(table)
    for enum in ["subscriptionstatus", "paymentstatus", "producttype", "attemptstatus", "teststatus", "difficulty", "userrole"]:
        sa.Enum(name=enum).drop(op.get_bind(), checkfirst=True)
