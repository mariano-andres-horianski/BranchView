from pydantic import BaseModel, Field

class StockBase(BaseModel):
    nombre_producto: str = Field(..., min_length=1)
    cantidad: int = Field(..., ge=0)
    stock_seguridad: int = Field(..., ge=0)

class StockCreate(StockBase):
    pass

class StockUpdateQuantity(BaseModel):
    cantidad: int = Field(..., ge=0)

class StockResponse(StockBase):
    id: int
    id_sucursal: int
    estado: str  # 'normal', 'bajo', 'agotado'

    class Config:
        from_attributes = True
