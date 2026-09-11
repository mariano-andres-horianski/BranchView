from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class Stock(Base):
    __tablename__ = "stock"

    id = Column(Integer, primary_key=True, index=True)
    nombre_producto = Column(String(150), nullable=False)
    cantidad = Column(Integer, default=0, nullable=False)
    stock_seguridad = Column(Integer, default=0, nullable=False)
    id_sucursal = Column(Integer, ForeignKey("sucursal.id", ondelete="CASCADE"), nullable=False)

    sucursal = relationship("Sucursal", back_populates="stock_items")

    @property
    def estado(self) -> str:
        if self.cantidad >= self.stock_seguridad:
            return "normal"
        elif self.cantidad > 0:
            return "bajo"
        else:
            return "agotado"

    def __repr__(self):
        return f"<Stock {self.nombre_producto}: {self.cantidad}/{self.stock_seguridad} ({self.estado})>"
