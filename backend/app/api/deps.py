from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from app.core.config import settings
from app.db.session import SessionLocal
from app.models.usuario import Usuario
from app.models.sucursal import Sucursal

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> Usuario:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales no válidas o sesión expirada",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(Usuario).filter(Usuario.username == username).first()
    if user is None:
        raise credentials_exception
    return user

def require_supervisor(
    current_user: Usuario = Depends(get_current_user)
) -> Usuario:
    if current_user.rol != "supervisor":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operación permitida únicamente para supervisores"
        )
    return current_user

def require_gerente(
    current_user: Usuario = Depends(get_current_user)
) -> Usuario:
    if current_user.rol != "gerente":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operación permitida únicamente para gerentes"
        )
    return current_user

def verify_branch_read_access(
    branch_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Sucursal:
    branch = db.query(Sucursal).filter(Sucursal.id == branch_id).first()
    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sucursal no encontrada"
        )

    if current_user.rol == "supervisor":
        return branch

    # Gerente: can only access their assigned branch
    if not current_user.sucursal or current_user.sucursal.id != branch_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para acceder a los datos de esta sucursal"
        )
    return branch

def require_branch_manager_write(
    branch_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Sucursal:
    """
    Enforces that ONLY the assigned manager of this branch can perform operational updates
    (employees, stock, finances, manual alerts). Supervisors cannot make direct operational changes.
    """
    if current_user.rol != "gerente":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo el gerente asignado puede realizar modificaciones operativas en esta sucursal"
        )

    branch = db.query(Sucursal).filter(Sucursal.id == branch_id).first()
    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sucursal no encontrada"
        )

    if not current_user.sucursal or current_user.sucursal.id != branch_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes autorización para modificar los datos operativos de esta sucursal"
        )

    return branch
