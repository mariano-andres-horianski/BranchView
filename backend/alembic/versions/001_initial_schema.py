"""Initial schema

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-09-10 12:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial_schema'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # usuario
    op.create_table(
        'usuario',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('nombre', sa.String(length=100), nullable=False),
        sa.Column('rol', sa.String(length=20), nullable=False),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_usuario_id'), 'usuario', ['id'], unique=False)
    op.create_index(op.f('ix_usuario_username'), 'usuario', ['username'], unique=True)

    # sucursal
    op.create_table(
        'sucursal',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('direccion', sa.String(length=255), nullable=False),
        sa.Column('id_gerente', sa.Integer(), nullable=True),
        sa.Column('ventas_mes', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('ventas_anio', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('ganancias_netas_mes', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('ganancias_netas_anio', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('activa', sa.Boolean(), nullable=False, server_default='true'),
        sa.ForeignKeyConstraint(['id_gerente'], ['usuario.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('id_gerente')
    )
    op.create_index(op.f('ix_sucursal_id'), 'sucursal', ['id'], unique=False)

    # stock
    op.create_table(
        'stock',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre_producto', sa.String(length=150), nullable=False),
        sa.Column('cantidad', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('stock_seguridad', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('id_sucursal', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['id_sucursal'], ['sucursal.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_stock_id'), 'stock', ['id'], unique=False)

    # empleado
    op.create_table(
        'empleado',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=150), nullable=False),
        sa.Column('dni', sa.String(length=20), nullable=False),
        sa.Column('rol', sa.String(length=100), nullable=False),
        sa.Column('sueldo', sa.Float(), nullable=False, server_default='0.0'),
        sa.Column('asistencias', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('faltas', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('antiguedad', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('edad', sa.Integer(), nullable=False),
        sa.Column('activo', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('id_sucursal', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['id_sucursal'], ['sucursal.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_empleado_id'), 'empleado', ['id'], unique=False)

    # alerta
    op.create_table(
        'alerta',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('gravedad', sa.String(length=20), nullable=False),
        sa.Column('mensaje', sa.String(length=255), nullable=False),
        sa.Column('tipo', sa.String(length=20), nullable=False),
        sa.Column('detalle', sa.Text(), nullable=False),
        sa.Column('id_usuario', sa.Integer(), nullable=True),
        sa.Column('fecha_creacion', sa.DateTime(), nullable=False),
        sa.Column('estado', sa.String(length=20), nullable=False, server_default='activa'),
        sa.ForeignKeyConstraint(['id_usuario'], ['usuario.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_alerta_id'), 'alerta', ['id'], unique=False)

    # alerta_sucursal
    op.create_table(
        'alerta_sucursal',
        sa.Column('id_alerta', sa.Integer(), nullable=False),
        sa.Column('id_sucursal', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['id_alerta'], ['alerta.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['id_sucursal'], ['sucursal.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id_alerta', 'id_sucursal')
    )

def downgrade() -> None:
    op.drop_table('alerta_sucursal')
    op.drop_index(op.f('ix_alerta_id'), table_name='alerta')
    op.drop_table('alerta')
    op.drop_index(op.f('ix_empleado_id'), table_name='empleado')
    op.drop_table('empleado')
    op.drop_index(op.f('ix_stock_id'), table_name='stock')
    op.drop_table('stock')
    op.drop_index(op.f('ix_sucursal_id'), table_name='sucursal')
    op.drop_table('sucursal')
    op.drop_index(op.f('ix_usuario_username'), table_name='usuario')
    op.drop_index(op.f('ix_usuario_id'), table_name='usuario')
    op.drop_table('usuario')
