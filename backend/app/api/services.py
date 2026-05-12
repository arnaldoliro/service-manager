from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.server import Server
from app.models.service import Service
from app.models.audit_log import AuditLog
from app.models.user import User
from app.services.security import get_current_user
from app.services.winrm_service import WinRMService
from app.services.tomcat_service import TomcatService

router = APIRouter(prefix="/api/servers", tags=["services"])

SERVICE_NAME_PATTERN = r'^[A-Za-z0-9_\-\.]{1,256}$'


class ServiceResponse(BaseModel):
    id: int
    server_id: int
    service_name: str
    status: str

    class Config:
        from_attributes = True


def _get_server_or_404(server_id: int, db: Session) -> Server:
    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Servidor não encontrado")
    return server


@router.get("/{server_id}/services", response_model=list[ServiceResponse])
def list_services(
    server_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_server_or_404(server_id, db)
    return db.query(Service).filter(Service.server_id == server_id).all()


@router.post("/{server_id}/services/sync")
def sync_services(
    server_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    server = _get_server_or_404(server_id, db)
    winrm = WinRMService(server.hostname, server.username, server.password, server.winrm_port)
    tomcat = TomcatService(winrm)

    remote_services = tomcat.list_services()
    existing = {
        s.service_name: s
        for s in db.query(Service).filter(Service.server_id == server_id).all()
    }
    for svc in remote_services:
        if svc["name"] in existing:
            existing[svc["name"]].status = str(svc["status"]).lower()
        else:
            db.add(Service(server_id=server_id, service_name=svc["name"], status=str(svc["status"]).lower()))

    db.commit()
    return {"synced": len(remote_services)}


@router.post("/{server_id}/services/{service_name}/start")
def start_service(
    server_id: int,
    service_name: Annotated[str, Path(pattern=SERVICE_NAME_PATTERN)],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    server = _get_server_or_404(server_id, db)
    winrm = WinRMService(server.hostname, server.username, server.password, server.winrm_port)
    result = TomcatService(winrm).start(service_name)

    db.add(AuditLog(user_id=current_user.id, server_id=server_id, action=f"service_start:{service_name}"))
    db.commit()

    if not result.success:
        raise HTTPException(status_code=500, detail="Service start failed")
    return {"status": "started", "output": result.stdout}


@router.post("/{server_id}/services/{service_name}/stop")
def stop_service(
    server_id: int,
    service_name: Annotated[str, Path(pattern=SERVICE_NAME_PATTERN)],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    server = _get_server_or_404(server_id, db)
    winrm = WinRMService(server.hostname, server.username, server.password, server.winrm_port)
    result = TomcatService(winrm).stop(service_name)

    db.add(AuditLog(user_id=current_user.id, server_id=server_id, action=f"service_stop:{service_name}"))
    db.commit()

    if not result.success:
        raise HTTPException(status_code=500, detail="Service stop failed")
    return {"status": "stopped", "output": result.stdout}


@router.post("/{server_id}/services/{service_name}/restart")
def restart_service(
    server_id: int,
    service_name: Annotated[str, Path(pattern=SERVICE_NAME_PATTERN)],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    server = _get_server_or_404(server_id, db)
    winrm = WinRMService(server.hostname, server.username, server.password, server.winrm_port)
    result = TomcatService(winrm).restart(service_name)

    db.add(AuditLog(user_id=current_user.id, server_id=server_id, action=f"service_restart:{service_name}"))
    db.commit()

    if not result.success:
        raise HTTPException(status_code=500, detail="Service restart failed")
    return {"status": "restarted", "output": result.stdout}
