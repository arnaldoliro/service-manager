import re
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, field_validator
from app.database import get_db
from app.models.user import User
from app.models.audit_log import AuditLog
from app.services.security import hash_password, verify_password, create_token, get_current_user
from app.services.limiter import limiter

router = APIRouter(prefix="/api/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator("username")
    @classmethod
    def username_format(cls, v: str) -> str:
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters")
        if not re.match(r'^[A-Za-z0-9_\-\.]+$', v):
            raise ValueError("Username contains invalid characters")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str
    is_admin: bool


@router.post("/register", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(request: Request, payload: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(status_code=400, detail="Username já em uso")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="E-mail já em uso")

    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"id": user.id, "username": user.username, "email": user.email}


@router.post("/login", response_model=TokenResponse)
@limiter.limit("10/minute")
def login(
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.username == form.username).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")

    from app.models.team_member import TeamMember
    from app.models.team import Team

    primary_membership = (
        db.query(TeamMember)
        .join(Team)
        .filter(TeamMember.user_id == user.id, Team.status == "active")
        .first()
    )

    token = create_token({
        "sub": str(user.id),
        "role": "admin" if user.is_admin else "user",
        "team_id": primary_membership.team_id if primary_membership else None,
        "team_role": primary_membership.role.value if primary_membership else None,
    })

    log = AuditLog(
        user_id=user.id,
        action="login",
        details=f"Login de {user.username}",
        ip_address=request.client.host if request.client else None,
    )
    db.add(log)
    db.commit()

    return TokenResponse(access_token=token, username=user.username, is_admin=user.is_admin)


@router.get("/me")
def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from app.models.team_member import TeamMember
    from app.models.team import Team

    primary_membership = (
        db.query(TeamMember)
        .join(Team)
        .filter(TeamMember.user_id == current_user.id, Team.status == "active")
        .first()
    )

    return {
        "id": current_user.id,
        "username": current_user.username,
        "email": current_user.email,
        "is_admin": current_user.is_admin,
        "role": current_user.role,
        "team_id": primary_membership.team_id if primary_membership else None,
        "team_role": primary_membership.role.value if primary_membership else None,
        "team_name": primary_membership.team.name if primary_membership else None,
    }


@router.put("/password", status_code=status.HTTP_200_OK)
def change_password(
    payload: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Senha atual incorreta")
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Senha alterada com sucesso"}
