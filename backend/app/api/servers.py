import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.server import Server
from app.models.user import User
from app.services.limiter import limiter
from app.services.security import get_admin_user, get_current_user
from app.services.winrm_service import WinRMService

router = APIRouter(prefix="/api/servers", tags=["servers"])

_HOSTNAME_RE = re.compile(
    r"^("
    r"(\d{1,3}\.){3}\d{1,3}"           # IPv4
    r"|"
    r"([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9]{1,63}"  # hostname/FQDN
    r")$"
)


class ServerCreate(BaseModel):
    hostname: str
    username: str
    password: str
    winrm_port: int = 5985
    description: Optional[str] = None


class ServerUpdate(BaseModel):
    hostname: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    winrm_port: Optional[int] = None
    description: Optional[str] = None


class ConnectionTestRequest(BaseModel):
    hostname: str
    username: str
    password: str
    winrm_port: int = 5985

    @field_validator("hostname")
    @classmethod
    def hostname_must_be_valid(cls, v: str) -> str:
        v = v.strip()
        if not v or not _HOSTNAME_RE.match(v):
            raise ValueError("Invalid hostname or IP address")
        return v

    @field_validator("winrm_port")
    @classmethod
    def port_must_be_valid(cls, v: int) -> int:
        if not (1 <= v <= 65535):
            raise ValueError("Port must be between 1 and 65535")
        return v

    @field_validator("username")
    @classmethod
    def username_must_not_be_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Username is required")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_must_not_be_empty(cls, v: str) -> str:
        if not v:
            raise ValueError("Password is required")
        return v


class ServerResponse(BaseModel):
    id: int
    hostname: str
    username: str
    winrm_port: int
    description: Optional[str]

    class Config:
        from_attributes = True


@router.get("/", response_model=list[ServerResponse])
def list_servers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.is_admin:
        return db.query(Server).all()
    from app.services.rbac_service import RBACService
    return RBACService(db).get_filtered_servers(current_user.id)


@router.post("/test")
@limiter.limit("10/minute")
def test_connection(
    request: Request,
    payload: ConnectionTestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
):
    """
    Tests WinRM connectivity without persisting anything.
    Runs a single read-only command ($env:COMPUTERNAME) with a 10s timeout.
    Rate-limited to 10 requests/minute per IP to prevent credential probing.
    Error details are intentionally generic to avoid leaking network topology.
    """
    winrm_svc = WinRMService(
        hostname=payload.hostname,
        username=payload.username,
        password=payload.password,
        port=payload.winrm_port,
    )
    result = winrm_svc.test_connection()

    db.add(AuditLog(
        user_id=current_user.id,
        action="server_connection_test",
        details=f"Test to {payload.hostname}:{payload.winrm_port} — {'success' if result.success else 'failed'}",
    ))
    db.commit()

    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Connection failed. Check hostname, port, credentials and ensure WinRM is enabled on the target server.",
        )

    return {
        "success": True,
        "latency_ms": result.latency_ms,
        "remote_hostname": result.remote_hostname,
    }


@router.post("/", response_model=ServerResponse, status_code=status.HTTP_201_CREATED)
def create_server(
    payload: ServerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_admin_user),
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
    current_user: User = Depends(get_admin_user),
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
    current_user: User = Depends(get_admin_user),
):
    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Servidor não encontrado")

    db.add(AuditLog(user_id=current_user.id, server_id=server.id, action="server_deleted"))
    db.delete(server)
    db.commit()
