from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class Empleado(Base):
    __tablename__ = "empleado"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(150), nullable=False)
    dni = Column(String(20), nullable=False)
    rol = Column(String(100), nullable=False)
    sueldo = Column(Float, default=0.0, nullable=False)
    asistencias = Column(Integer, default=0, nullable=False)
    faltas = Column(Integer, default=0, nullable=False)
    antiguedad = Column(Integer, default=0, nullable=False)  # in years or months
    edad = Column(Integer, nullable=False)
    activo = Column(Boolean, default=True, nullable=False)  # logical delete
    id_sucursal = Column(Integer, ForeignKey("sucursal.id", ondelete="CASCADE"), nullable=False)

    sucursal = relationship("Sucursal", back_populates="empleados")

    def __repr__(self):
        return f"<Empleado {self.nombre} ({self.rol}) - Activo={self.activo}>"
