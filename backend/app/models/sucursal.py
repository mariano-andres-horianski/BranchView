from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.db.base import Base

class Sucursal(Base):
    __tablename__ = "sucursal"

    id = Column(Integer, primary_key=True, index=True)
    direccion = Column(String(255), nullable=False)
    id_gerente = Column(Integer, ForeignKey("usuario.id"), nullable=True)
    ventas_mes = Column(Float, default=0.0, nullable=False)
    ventas_anio = Column(Float, default=0.0, nullable=False)
    ganancias_netas_mes = Column(Float, default=0.0, nullable=False)
    ganancias_netas_anio = Column(Float, default=0.0, nullable=False)
    activa = Column(Boolean, default=True, nullable=False)

    __table_args__ = (
        Index(
            "uq_sucursal_active_gerente",
            "id_gerente",
            unique=True,
            postgresql_where=(activa == True)
        ),
    )

    gerente = relationship("Usuario", back_populates="sucursal")
    empleados = relationship("Empleado", back_populates="sucursal", cascade="all, delete-orphan")
    stock_items = relationship("Stock", back_populates="sucursal", cascade="all, delete-orphan")
    alertas = relationship("Alerta", secondary="alerta_sucursal", back_populates="sucursales")
    finanzas_mensuales = relationship("FinanzasMensuales", back_populates="sucursal", cascade="all, delete-orphan")

    @property
    def margen_neto_mes(self) -> float:
        if self.ventas_mes > 0:
            return round((self.ganancias_netas_mes / self.ventas_mes) * 100, 2)
        return 0.0

    def __repr__(self):
        return f"<Sucursal {self.id}: {self.direccion} (activa={self.activa})>"
