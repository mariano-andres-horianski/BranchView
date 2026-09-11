from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class Alerta(Base):
    __tablename__ = "alerta"

    id = Column(Integer, primary_key=True, index=True)
    gravedad = Column(String(20), nullable=False)  # 'roja', 'naranja', 'amarilla'
    mensaje = Column(String(255), nullable=False)
    tipo = Column(String(20), nullable=False)      # 'stock', 'financiera', 'manual'
    detalle = Column(Text, nullable=False)
    id_usuario = Column(Integer, ForeignKey("usuario.id"), nullable=True)
    fecha_creacion = Column(DateTime, default=datetime.utcnow, nullable=False)
    estado = Column(String(20), default="activa", nullable=False)  # 'activa', 'resuelta'

    usuario = relationship("Usuario", back_populates="alertas_creadas")
    sucursales = relationship("Sucursal", secondary="alerta_sucursal", back_populates="alertas")

    def __repr__(self):
        return f"<Alerta {self.id}: {self.gravedad} - {self.tipo} - {self.estado}>"
