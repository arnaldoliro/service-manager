import os
import re
import tempfile
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.server import Server
from app.models.deployment import Deployment
from app.models.audit_log import AuditLog
from app.models.user import User
from app.services.security import get_current_user
from app.services.winrm_service import WinRMService
from app.services.tomcat_service import TomcatService

router = APIRouter(prefix="/api/deploy", tags=["deploy"])

MAX_WAR_SIZE = 500 * 1024 * 1024  # 500 MB
_APP_NAME_RE = re.compile(r'^[A-Za-z0-9_\-]{1,128}$')


@router.post("/")
async def deploy_war(
    server_id: int = Form(...),
    app_name: str = Form(...),
    war_file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not war_file.filename.endswith(".war"):
        raise HTTPException(status_code=400, detail="Apenas arquivos .war são aceitos")

    if not _APP_NAME_RE.match(app_name):
        raise HTTPException(status_code=400, detail="app_name contains invalid characters")

    content = await war_file.read(MAX_WAR_SIZE + 1)
    if len(content) > MAX_WAR_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum allowed: 500 MB")

    if content[:4] != b'PK\x03\x04':
        raise HTTPException(status_code=400, detail="File is not a valid ZIP/WAR archive")

    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Servidor não encontrado")

    deployment = Deployment(
        server_id=server_id,
        user_id=current_user.id,
        jar_filename=war_file.filename,
        status="in_progress",
    )
    db.add(deployment)
    db.commit()
    db.refresh(deployment)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".war") as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        winrm = WinRMService(server.hostname, server.username, server.password, server.winrm_port)
        result = TomcatService(winrm).deploy_war(tmp_path, app_name)

        deployment.status = "success" if result.success else "failed"
        deployment.error_message = None if result.success else "Deploy failed"
        deployment.completed_at = datetime.now(timezone.utc)
    except ValueError as exc:
        deployment.status = "failed"
        deployment.error_message = str(exc)
        deployment.completed_at = datetime.now(timezone.utc)
    except Exception:
        deployment.status = "failed"
        deployment.error_message = "Deploy failed due to an internal error"
        deployment.completed_at = datetime.now(timezone.utc)
    finally:
        os.unlink(tmp_path)

    db.add(AuditLog(
        user_id=current_user.id,
        server_id=server_id,
        action=f"deploy:{app_name}",
        details=deployment.error_message[:500] if deployment.error_message else None,
    ))
    db.commit()

    return {
        "deployment_id": deployment.id,
        "status": deployment.status,
        "output": deployment.error_message,
    }


@router.get("/history/{server_id}")
def deployment_history(
    server_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Deployment)
        .filter(Deployment.server_id == server_id)
        .order_by(Deployment.started_at.desc())
        .limit(50)
        .all()
    )
