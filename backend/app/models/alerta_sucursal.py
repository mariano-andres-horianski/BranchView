from sqlalchemy import Column, Integer, ForeignKey
from app.db.base import Base

class AlertaSucursal(Base):
    __tablename__ = "alerta_sucursal"

    id_alerta = Column(Integer, ForeignKey("alerta.id", ondelete="CASCADE"), primary_key=True)
    id_sucursal = Column(Integer, ForeignKey("sucursal.id", ondelete="CASCADE"), primary_key=True)
