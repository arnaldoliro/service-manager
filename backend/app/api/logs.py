from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.server import Server
from app.models.audit_log import AuditLog
from app.models.user import User
from app.services.security import get_current_user
from app.services.winrm_service import WinRMService
from app.services.tomcat_service import TomcatService

router = APIRouter(prefix="/api/servers", tags=["logs"])


@router.get("/{server_id}/logs")
def get_server_logs(
    server_id: int,
    lines: int = Query(default=200, ge=10, le=2000),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Servidor não encontrado")

    winrm = WinRMService(server.hostname, server.username, server.password, server.winrm_port)
    log_content = TomcatService(winrm).get_logs(lines)

    return {"server_id": server_id, "lines": lines, "content": log_content}


@router.get("/{server_id}/audit")
def get_audit_logs(
    server_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.server_id == server_id)
        .order_by(AuditLog.timestamp.desc())
        .limit(100)
        .all()
    )
    return [
        {
            "id": log.id,
            "action": log.action,
            "details": log.details,
            "timestamp": log.timestamp,
            "user_id": log.user_id,
        }
        for log in logs
    ]
