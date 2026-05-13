import re
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Application, ApplicationStatus, Deployment, Server, User, AuditLog
from app.services.security import get_current_user, get_admin_user
from app.services.winrm_service import WinRMService
from app.services.deployment_service import DeploymentService
from app.utils.file_validation import validate_jar_file

router = APIRouter(prefix="/api/applications", tags=["applications"])

_NAME_RE = re.compile(r'^[A-Za-z0-9_\-]{1,128}$')
_SERVICE_RE = re.compile(r'^[A-Za-z0-9_\-\.]{1,256}$')
_JAR_RE = re.compile(r'^[A-Za-z0-9_\-\.]{1,128}\.jar$')
_PATH_RE = re.compile(r'^[A-Za-z]:\\[A-Za-z0-9_\-\\\.]{1,200}$')


def _get_app_or_404(app_id: int, db: Session) -> Application:
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    return app


def _get_server_or_404(server_id: int, db: Session) -> Server:
    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    return server


def _audit(db: Session, user_id: int, action: str, details: str, server_id: int = None):
    db.add(AuditLog(user_id=user_id, server_id=server_id, action=action, details=details))
    db.commit()


@router.get("/")
def list_applications(
    server_id: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Application)
    if server_id:
        query = query.filter(Application.server_id == server_id)
    return [
        {
            "id": a.id,
            "app_name": a.app_name,
            "jar_name": a.jar_name,
            "context_name": a.context_name,
            "tomcat_home": a.tomcat_home,
            "tomcat_service_name": a.tomcat_service_name,
            "current_version": a.current_version,
            "status": a.status.value,
            "server_id": a.server_id,
            "last_deployed": a.last_deployed,
        }
        for a in query.all()
    ]


@router.post("/", status_code=201)
def create_application(
    server_id: int = Form(...),
    app_name: str = Form(...),
    jar_name: str = Form(...),
    context_name: str = Form(...),
    tomcat_home: str = Form(...),
    tomcat_service_name: str = Form(...),
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    if not _NAME_RE.match(app_name):
        raise HTTPException(status_code=400, detail="app_name contains invalid characters")
    if not _JAR_RE.match(jar_name):
        raise HTTPException(status_code=400, detail="jar_name must be a valid .jar filename")
    if not _NAME_RE.match(context_name):
        raise HTTPException(status_code=400, detail="context_name contains invalid characters")
    if not _PATH_RE.match(tomcat_home):
        raise HTTPException(status_code=400, detail="tomcat_home must be a valid Windows path (e.g. C:\\tomcat)")
    if not _SERVICE_RE.match(tomcat_service_name):
        raise HTTPException(status_code=400, detail="tomcat_service_name contains invalid characters")

    server = _get_server_or_404(server_id, db)

    existing = db.query(Application).filter(
        Application.server_id == server_id,
        Application.app_name == app_name,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Application already exists on this server")

    app = Application(
        server_id=server_id,
        app_name=app_name,
        jar_name=jar_name,
        context_name=context_name,
        tomcat_home=tomcat_home,
        tomcat_service_name=tomcat_service_name,
    )
    db.add(app)
    db.commit()
    db.refresh(app)

    _audit(db, current_user.id, "create_application",
           f"Created application {app_name} on server {server.hostname}", server_id)

    return {"id": app.id, "app_name": app.app_name, "status": "created"}


@router.get("/{app_id}")
def get_application(
    app_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app = _get_app_or_404(app_id, db)
    return {
        "id": app.id,
        "app_name": app.app_name,
        "jar_name": app.jar_name,
        "context_name": app.context_name,
        "tomcat_home": app.tomcat_home,
        "tomcat_service_name": app.tomcat_service_name,
        "current_version": app.current_version,
        "status": app.status.value,
        "server_id": app.server_id,
        "last_deployed": app.last_deployed,
        "created_at": app.created_at,
    }


@router.delete("/{app_id}", status_code=204)
def delete_application(
    app_id: int,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    app = _get_app_or_404(app_id, db)
    _audit(db, current_user.id, "delete_application",
           f"Deleted application {app.app_name}", app.server_id)
    db.delete(app)
    db.commit()


@router.post("/{app_id}/deploy")
async def deploy_application(
    app_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app = _get_app_or_404(app_id, db)
    server = _get_server_or_404(app.server_id, db)

    file_bytes = await file.read()
    is_valid, message = validate_jar_file(file.filename, file_bytes)
    if not is_valid:
        raise HTTPException(status_code=400, detail=message)

    deployment = Deployment(
        application_id=app_id,
        server_id=server.id,
        user_id=current_user.id,
        jar_filename=file.filename,
        status="in_progress",
    )
    db.add(deployment)
    db.commit()

    try:
        winrm = WinRMService(server.hostname, server.username, server.password, server.winrm_port)
        result = DeploymentService(winrm, app).deploy(file_bytes)

        if result["success"]:
            deployment.status = "success"
            deployment.deployment_steps = json.dumps(result["steps"])
            deployment.completed_at = datetime.now(timezone.utc)

            app.status = ApplicationStatus.RUNNING
            app.last_deployed = datetime.now(timezone.utc)
            db.commit()

            _audit(db, current_user.id, "deploy_application",
                   f"Deployed {app.app_name} ({file.filename}) on {server.hostname}",
                   server.id)

            return {
                "success": True,
                "deployment_id": deployment.id,
                "steps": result["steps"],
            }
        else:
            deployment.status = "failed"
            deployment.error_message = "Deployment failed"
            deployment.deployment_steps = json.dumps(result["steps"])
            deployment.completed_at = datetime.now(timezone.utc)
            db.commit()
            raise HTTPException(status_code=500, detail="Deployment failed")

    except HTTPException:
        raise
    except Exception:
        deployment.status = "failed"
        deployment.error_message = "Deployment failed due to an internal error"
        deployment.completed_at = datetime.now(timezone.utc)
        db.commit()
        raise HTTPException(status_code=500, detail="Deployment failed due to an internal error")


def _run_action(app_id: int, action: str, new_status: ApplicationStatus,
                current_user: User, db: Session):
    app = _get_app_or_404(app_id, db)
    server = _get_server_or_404(app.server_id, db)

    svc = app.tomcat_service_name
    if action == "start":
        script = f'$svc = "{svc}"; Start-Service -Name $svc -ErrorAction Stop'
    elif action == "stop":
        script = f'$svc = "{svc}"; Stop-Service -Name $svc -Force -ErrorAction Stop'
    else:
        script = f'$svc = "{svc}"; Restart-Service -Name $svc -Force -ErrorAction Stop'

    winrm = WinRMService(server.hostname, server.username, server.password, server.winrm_port)
    result = winrm.execute_powershell(script)

    if not result.success:
        raise HTTPException(status_code=500, detail=f"{action.capitalize()} operation failed")

    app.status = new_status
    db.commit()
    _audit(db, current_user.id, f"{action}_application",
           f"{action.capitalize()}ed {app.app_name}", server.id)

    return {"success": True, "message": f"{action.capitalize()}ed {app.app_name}"}


@router.post("/{app_id}/action/start")
def start_application(
    app_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _run_action(app_id, "start", ApplicationStatus.RUNNING, current_user, db)


@router.post("/{app_id}/action/stop")
def stop_application(
    app_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _run_action(app_id, "stop", ApplicationStatus.STOPPED, current_user, db)


@router.post("/{app_id}/action/restart")
def restart_application(
    app_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _run_action(app_id, "restart", ApplicationStatus.RUNNING, current_user, db)


@router.get("/{app_id}/deployments")
def get_deployment_history(
    app_id: int,
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_app_or_404(app_id, db)
    deployments = (
        db.query(Deployment)
        .filter(Deployment.application_id == app_id)
        .order_by(Deployment.started_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": d.id,
            "version": d.version,
            "status": d.status,
            "jar_filename": d.jar_filename,
            "started_at": d.started_at,
            "completed_at": d.completed_at,
            "deployed_by": d.user.username if d.user else None,
        }
        for d in deployments
    ]


@router.get("/{app_id}/deployments/{deployment_id}")
def get_deployment_details(
    app_id: int,
    deployment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deployment = db.query(Deployment).filter(
        Deployment.id == deployment_id,
        Deployment.application_id == app_id,
    ).first()
    if not deployment:
        raise HTTPException(status_code=404, detail="Deployment not found")

    return {
        "id": deployment.id,
        "status": deployment.status,
        "jar_filename": deployment.jar_filename,
        "version": deployment.version,
        "started_at": deployment.started_at,
        "completed_at": deployment.completed_at,
        "steps": json.loads(deployment.deployment_steps) if deployment.deployment_steps else [],
        "error": deployment.error_message,
    }
