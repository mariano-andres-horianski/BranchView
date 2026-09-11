from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.core.security import verify_password, create_access_token
from app.models.usuario import Usuario
from app.models.sucursal import Sucursal
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])

def build_user_response(user: Usuario, db: Session) -> UserResponse:
    sucursal_id = None
    sucursal_direccion = None
    if user.rol == "gerente":
        sucursal = db.query(Sucursal).filter(Sucursal.id_gerente == user.id, Sucursal.activa == True).first()
        if sucursal:
            sucursal_id = sucursal.id
            sucursal_direccion = sucursal.direccion

    return UserResponse(
        id=user.id,
        username=user.username,
        nombre=user.nombre,
        rol=user.rol,
        sucursal_id=sucursal_id,
        sucursal_direccion=sucursal_direccion
    )

@router.post("/login", response_model=TokenResponse)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.username == login_data.username).first()
    if not user or not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_resp = build_user_response(user, db)
    claims = {
        "user_id": user.id,
        "rol": user.rol,
        "sucursal_id": user_resp.sucursal_id
    }
    access_token = create_access_token(subject=user.username, claims=claims)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_resp
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    return build_user_response(current_user, db)
