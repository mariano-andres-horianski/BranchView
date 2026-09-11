"""Create finanzas_mensuales table

Revision ID: 003_finanzas_mensuales
Revises: 002_partial_unique_gerente
Create Date: 2026-09-10 20:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '003_finanzas_mensuales'
down_revision: Union[str, None] = '002_partial_unique_gerente'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    op.create_table(
        'finanzas_mensuales',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('id_sucursal', sa.Integer(), nullable=False),
        sa.Column('anio', sa.Integer(), nullable=False),
        sa.Column('mes', sa.Integer(), nullable=False),
        sa.Column('ventas', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('costo_ventas', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('gastos_operativos', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('ganancias_brutas', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('ganancias_netas', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('margen_bruto', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('margen_neto', sa.Float(), nullable=False, server_default='0.0'),
        sa.ForeignKeyConstraint(['id_sucursal'], ['sucursal.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('id_sucursal', 'anio', 'mes', name='uq_finanzas_sucursal_anio_mes')
    )
    op.create_index(op.f('ix_finanzas_mensuales_id'), 'finanzas_mensuales', ['id'], unique=False)
    op.create_index(op.f('ix_finanzas_mensuales_id_sucursal'), 'finanzas_mensuales', ['id_sucursal'], unique=False)

def downgrade() -> None:
    op.drop_index(op.f('ix_finanzas_mensuales_id_sucursal'), table_name='finanzas_mensuales')
    op.drop_index(op.f('ix_finanzas_mensuales_id'), table_name='finanzas_mensuales')
    op.drop_table('finanzas_mensuales')
