"""Allow inactive branches to keep manager history while enforcing unique manager on active branches

Revision ID: 002_partial_unique_gerente
Revises: 001_initial_schema
Create Date: 2026-09-10 15:55:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '002_partial_unique_gerente'
down_revision: Union[str, None] = '001_initial_schema'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Drop table-wide unique constraint on id_gerente
    op.drop_constraint('sucursal_id_gerente_key', 'sucursal', type_='unique')
    
    # Create partial unique index only for active branches
    op.execute(
        "CREATE UNIQUE INDEX uq_sucursal_active_gerente ON sucursal (id_gerente) WHERE activa = true AND id_gerente IS NOT NULL;"
    )

def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_sucursal_active_gerente;")
    op.create_unique_constraint('sucursal_id_gerente_key', 'sucursal', ['id_gerente'])
