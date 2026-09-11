from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, verify_branch_read_access, require_branch_manager_write
from app.models.usuario import Usuario
from app.models.sucursal import Sucursal
from app.models.empleado import Empleado
from app.schemas.employee import EmployeeResponse, EmployeeCreate, EmployeeUpdate

router = APIRouter(tags=["employees"])

@router.get("/branches/{branch_id}/employees", response_model=List[EmployeeResponse])
def get_branch_employees(
    branch_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    branch = verify_branch_read_access(branch_id, current_user, db)
    employees = db.query(Empleado).filter(Empleado.id_sucursal == branch.id, Empleado.activo == True).all()
    return employees

@router.post("/branches/{branch_id}/employees", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_branch_employee(
    branch_id: int,
    emp_in: EmployeeCreate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    branch = require_branch_manager_write(branch_id, current_user, db)
    new_emp = Empleado(
        nombre=emp_in.nombre.strip(),
        dni=emp_in.dni.strip(),
        rol=emp_in.rol.strip(),
        sueldo=emp_in.sueldo,
        asistencias=emp_in.asistencias,
        faltas=emp_in.faltas,
        antiguedad=emp_in.antiguedad,
        edad=emp_in.edad,
        activo=True,
        id_sucursal=branch.id
    )
    db.add(new_emp)
    db.commit()
    db.refresh(new_emp)
    return new_emp

@router.get("/employees/{id}", response_model=EmployeeResponse)
def get_employee(
    id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    emp = db.query(Empleado).filter(Empleado.id == id, Empleado.activo == True).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    verify_branch_read_access(emp.id_sucursal, current_user, db)
    return emp

@router.put("/employees/{id}", response_model=EmployeeResponse)
def update_employee(
    id: int,
    emp_in: EmployeeUpdate,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    emp = db.query(Empleado).filter(Empleado.id == id, Empleado.activo == True).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    require_branch_manager_write(emp.id_sucursal, current_user, db)

    emp.nombre = emp_in.nombre.strip()
    emp.dni = emp_in.dni.strip()
    emp.rol = emp_in.rol.strip()
    emp.sueldo = emp_in.sueldo
    emp.asistencias = emp_in.asistencias
    emp.faltas = emp_in.faltas
    emp.antiguedad = emp_in.antiguedad
    emp.edad = emp_in.edad

    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp

@router.delete("/employees/{id}", status_code=status.HTTP_200_OK)
def delete_employee(
    id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    emp = db.query(Empleado).filter(Empleado.id == id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    if not emp.activo:
        raise HTTPException(status_code=400, detail="El empleado ya se encuentra dado de baja")

    require_branch_manager_write(emp.id_sucursal, current_user, db)

    # Logical delete
    emp.activo = False
    db.add(emp)
    db.commit()

    return {"message": f"Empleado {emp.nombre} (DNI {emp.dni}) dado de baja lógicamente con éxito"}
