from typing import Optional
from pydantic import BaseModel

class UserSimpleResponse(BaseModel):
    id: int
    username: str
    nombre: str
    rol: str
    is_assigned: bool = False

    class Config:
        from_attributes = True
