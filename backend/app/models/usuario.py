from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.db.base import Base

class Usuario(Base):
    __tablename__ = "usuario"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    nombre = Column(String(100), nullable=False)
    rol = Column(String(20), nullable=False)  # 'supervisor' or 'gerente'
    password_hash = Column(String(255), nullable=False)

    # A manager can be assigned to one branch
    sucursal = relationship("Sucursal", back_populates="gerente", uselist=False)
    alertas_creadas = relationship("Alerta", back_populates="usuario")

    def __repr__(self):
        return f"<Usuario {self.username} ({self.rol})>"
