import os
import shutil
import tempfile
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

    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Servidor não encontrado")

    deployment = Deployment(
        server_id=server_id,
        app_name=app_name,
        war_file=war_file.filename,
        status="in_progress",
    )
    db.add(deployment)
    db.commit()
    db.refresh(deployment)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".war") as tmp:
        shutil.copyfileobj(war_file.file, tmp)
        tmp_path = tmp.name

    try:
        winrm = WinRMService(server.hostname, server.username, server.password, server.winrm_port)
        result = TomcatService(winrm).deploy_war(tmp_path, app_name)

        deployment.status = "success" if result.success else "failed"
        deployment.output = result.stdout or result.stderr
    except Exception as exc:
        deployment.status = "failed"
        deployment.output = str(exc)
    finally:
        os.unlink(tmp_path)

    db.add(AuditLog(
        user_id=current_user.id,
        server_id=server_id,
        action=f"deploy:{app_name}",
        details=deployment.output,
    ))
    db.commit()

    return {
        "deployment_id": deployment.id,
        "status": deployment.status,
        "output": deployment.output,
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
        .order_by(Deployment.timestamp.desc())
        .limit(50)
        .all()
    )
