"""Add price_inr and negative_marking_ratio to tests.

Revision ID: 0004_test_pricing_marking
Revises: 0003_add_audit_log
Create Date: 2026-09-14
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004_test_pricing_marking"

down_revision: str | None = "0003_add_audit_log"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("tests", sa.Column("price_inr", sa.Integer(), nullable=False, server_default="0"))
    op.add_column(
        "tests",
        sa.Column("negative_marking_ratio", sa.Float(), nullable=False, server_default="0.0"),
    )


def downgrade() -> None:
    op.drop_column("tests", "negative_marking_ratio")
    op.drop_column("tests", "price_inr")
