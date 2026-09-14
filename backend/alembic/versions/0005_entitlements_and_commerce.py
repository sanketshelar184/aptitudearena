"""add entitlements and commerce fields

Revision ID: 0005_entitlements_commerce
Revises: 0004_test_pricing_marking
Create Date: 2026-09-14 12:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005_entitlements_commerce"
down_revision: str | None = "0004_test_pricing_marking"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Add description to products
    op.add_column("products", sa.Column("description", sa.Text(), nullable=True))

    # 2. Add provider_signature and error_reason to payments
    op.add_column("payments", sa.Column("provider_signature", sa.String(length=255), nullable=True))
    op.add_column("payments", sa.Column("error_reason", sa.Text(), nullable=True))

    # 3. Create entitlements table
    op.create_table(
        "entitlements",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
            primary_key=True,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("payment_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("test_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("credits_remaining", sa.Integer(), nullable=True, server_default="1"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["payment_id"], ["payments.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["test_id"], ["tests.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_entitlements_user_id", "entitlements", ["user_id"])
    op.create_index("ix_entitlements_product_id", "entitlements", ["product_id"])


def downgrade() -> None:
    op.drop_index("ix_entitlements_product_id", table_name="entitlements")
    op.drop_index("ix_entitlements_user_id", table_name="entitlements")
    op.drop_table("entitlements")
    op.drop_column("payments", "error_reason")
    op.drop_column("payments", "provider_signature")
    op.drop_column("products", "description")

