from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models.server import Server
from app.models.audit_log import AuditLog
from app.models.user import User
from app.services.security import get_current_user

router = APIRouter(prefix="/api/servers", tags=["servers"])


class ServerCreate(BaseModel):
    hostname: str
    username: str
    password: str
    port: int = 8080
    winrm_port: int = 5985
    description: Optional[str] = None


class ServerUpdate(BaseModel):
    hostname: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    port: Optional[int] = None
    winrm_port: Optional[int] = None
    description: Optional[str] = None


class ServerResponse(BaseModel):
    id: int
    hostname: str
    username: str
    port: int
    winrm_port: int
    description: Optional[str]

    class Config:
        from_attributes = True


@router.get("/", response_model=list[ServerResponse])
def list_servers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Server).all()


@router.post("/", response_model=ServerResponse, status_code=status.HTTP_201_CREATED)
def create_server(
    payload: ServerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    server = Server(**payload.model_dump())
    db.add(server)
    db.commit()
    db.refresh(server)

    db.add(AuditLog(user_id=current_user.id, server_id=server.id, action="server_created"))
    db.commit()
    return server


@router.get("/{server_id}", response_model=ServerResponse)
def get_server(
    server_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Servidor não encontrado")
    return server


@router.put("/{server_id}", response_model=ServerResponse)
def update_server(
    server_id: int,
    payload: ServerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Servidor não encontrado")

    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(server, field, value)

    db.commit()
    db.refresh(server)
    db.add(AuditLog(user_id=current_user.id, server_id=server.id, action="server_updated"))
    db.commit()
    return server


@router.delete("/{server_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_server(
    server_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Servidor não encontrado")

    db.add(AuditLog(user_id=current_user.id, server_id=server.id, action="server_deleted"))
    db.delete(server)
    db.commit()
