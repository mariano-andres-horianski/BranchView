from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, verify_branch_read_access, require_branch_manager_write
from app.models.usuario import Usuario
from app.models.stock import Stock
from app.schemas.stock import StockResponse, StockCreate, StockUpdateQuantity
from app.services.alert_service import AlertService

router = APIRouter(tags=["stock"])

@router.get("/branches/{branch_id}/stock", response_model=List[StockResponse])
def get_branch_stock(
    branch_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    branch = verify_branch_read_access(branch_id, current_user, db)
    stock_items = db.query(Stock).filter(Stock.id_sucursal == branch.id).all()
    return [
        StockResponse(
            id=s.id,
            id_sucursal=s.id_sucursal,
            nombre_producto=s.nombre_producto,
            cantidad=s.cantidad,
            stock_seguridad=s.stock_seguridad,
            estado=s.estado
        )
        for s in stock_items
    ]

@router.post("/branches/{branch_id}/stock", response_model=StockResponse, status_code=status.HTTP_201_CREATED)
def add_branch_stock(
    branch_id: int,
    stock_in: StockCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    branch = require_branch_manager_write(branch_id, current_user, db)
    new_item = Stock(
        nombre_producto=stock_in.nombre_producto.strip(),
        cantidad=stock_in.cantidad,
        stock_seguridad=stock_in.stock_seguridad,
        id_sucursal=branch.id
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)

    # Evaluate initial alert condition
    AlertService.evaluate_stock_alerts(db, branch.id, new_item)

    return StockResponse(
        id=new_item.id,
        id_sucursal=new_item.id_sucursal,
        nombre_producto=new_item.nombre_producto,
        cantidad=new_item.cantidad,
        stock_seguridad=new_item.stock_seguridad,
        estado=new_item.estado
    )

@router.put("/branches/{branch_id}/stock/{stock_id}", response_model=StockResponse)
def update_stock_quantity(
    branch_id: int,
    stock_id: int,
    stock_update: StockUpdateQuantity,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    branch = require_branch_manager_write(branch_id, current_user, db)
    stock_item = db.query(Stock).filter(Stock.id == stock_id, Stock.id_sucursal == branch.id).first()
    if not stock_item:
        raise HTTPException(status_code=404, detail="Producto de stock no encontrado")

    # Update quantity
    stock_item.cantidad = stock_update.cantidad
    db.add(stock_item)
    db.commit()
    db.refresh(stock_item)

    # Automatically recalculate condition and manage alerts
    AlertService.evaluate_stock_alerts(db, branch.id, stock_item)

    return StockResponse(
        id=stock_item.id,
        id_sucursal=stock_item.id_sucursal,
        nombre_producto=stock_item.nombre_producto,
        cantidad=stock_item.cantidad,
        stock_seguridad=stock_item.stock_seguridad,
        estado=stock_item.estado
    )
