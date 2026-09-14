"""Add stable question ordering to attempts.

Revision ID: 0002_attempt_answer_position
Revises: 0001_core_platform
Create Date: 2026-09-06
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002_attempt_answer_position"
down_revision: str | None = "0001_core_platform"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("test_answers", sa.Column("position", sa.Integer(), nullable=True))
    op.execute("UPDATE test_answers SET position = 1 WHERE position IS NULL")
    op.alter_column("test_answers", "position", nullable=False)


def downgrade() -> None:
    op.drop_column("test_answers", "position")
