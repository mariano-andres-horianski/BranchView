from sqlalchemy import Column, Integer, Float, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base

class FinanzasMensuales(Base):
    __tablename__ = "finanzas_mensuales"

    id = Column(Integer, primary_key=True, index=True)
    id_sucursal = Column(Integer, ForeignKey("sucursal.id", ondelete="CASCADE"), nullable=False, index=True)
    anio = Column(Integer, nullable=False)
    mes = Column(Integer, nullable=False)  # 1 to 12
    ventas = Column(Float, default=0.0, nullable=False)
    costo_ventas = Column(Float, default=0.0, nullable=False)
    gastos_operativos = Column(Float, default=0.0, nullable=False)
    ganancias_brutas = Column(Float, default=0.0, nullable=False)
    ganancias_netas = Column(Float, default=0.0, nullable=False)
    margen_bruto = Column(Float, default=0.0, nullable=False)
    margen_neto = Column(Float, default=0.0, nullable=False)

    sucursal = relationship("Sucursal", back_populates="finanzas_mensuales")

    __table_args__ = (
        UniqueConstraint("id_sucursal", "anio", "mes", name="uq_finanzas_sucursal_anio_mes"),
    )

    def __repr__(self):
        return f"<FinanzasMensuales Sucursal={self.id_sucursal} {self.anio}-{self.mes:02d}: Ventas={self.ventas} Netas={self.ganancias_netas}>"
