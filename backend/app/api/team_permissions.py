from typing import Dict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AuditLog, Application, Server, Team, TeamApplication, TeamServer, User
from app.services.security import get_admin_user

router = APIRouter(tags=["team-permissions"])


class ServerAssign(BaseModel):
    server_id: int
    permissions: Dict[str, bool] = {"view": True, "deploy": False, "restart": False}


class AppAssign(BaseModel):
    application_id: int
    permissions: Dict[str, bool] = {"view": True, "deploy": False, "restart": False}


class PermissionUpdate(BaseModel):
    permissions: Dict[str, bool]


def _get_team_or_404(team_id: int, db: Session) -> Team:
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


# ---------------------------------------------------------------------------
# Server assignments
# ---------------------------------------------------------------------------

@router.get("/api/admin/teams/{team_id}/servers")
def list_team_servers(
    team_id: int,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    _get_team_or_404(team_id, db)
    team_servers = db.query(TeamServer).filter(TeamServer.team_id == team_id).all()
    return [
        {
            "id": ts.id,
            "server_id": ts.server_id,
            "hostname": ts.server.hostname if ts.server else None,
            "description": ts.server.description if ts.server else None,
            "permissions": ts.permissions,
            "assigned_at": ts.assigned_at,
        }
        for ts in team_servers
    ]


@router.post("/api/admin/teams/{team_id}/servers", status_code=201)
def assign_server(
    team_id: int,
    payload: ServerAssign,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    team = _get_team_or_404(team_id, db)

    if not db.query(Server).filter(Server.id == payload.server_id).first():
        raise HTTPException(status_code=404, detail="Server not found")

    existing = db.query(TeamServer).filter(
        TeamServer.team_id == team_id, TeamServer.server_id == payload.server_id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Server already assigned to this team")

    ts = TeamServer(team_id=team_id, server_id=payload.server_id, permissions=payload.permissions)
    db.add(ts)
    db.commit()
    db.refresh(ts)

    db.add(AuditLog(
        user_id=current_user.id,
        action="team_server_assigned",
        server_id=payload.server_id,
        details=f"Assigned server {payload.server_id} to team '{team.name}' with permissions {payload.permissions}",
    ))
    db.commit()
    return {
        "id": ts.id,
        "team_id": ts.team_id,
        "server_id": ts.server_id,
        "permissions": ts.permissions,
        "assigned_at": ts.assigned_at,
    }


@router.put("/api/admin/teams/{team_id}/servers/{server_id}")
def update_server_permissions(
    team_id: int,
    server_id: int,
    payload: PermissionUpdate,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    team = _get_team_or_404(team_id, db)
    ts = db.query(TeamServer).filter(
        TeamServer.team_id == team_id, TeamServer.server_id == server_id
    ).first()
    if not ts:
        raise HTTPException(status_code=404, detail="Server not assigned to this team")

    ts.permissions = payload.permissions
    db.commit()
    db.refresh(ts)

    db.add(AuditLog(
        user_id=current_user.id,
        action="team_server_permissions_updated",
        server_id=server_id,
        details=f"Updated server {server_id} permissions in team '{team.name}': {payload.permissions}",
    ))
    db.commit()
    return {"team_id": ts.team_id, "server_id": ts.server_id, "permissions": ts.permissions}


@router.delete("/api/admin/teams/{team_id}/servers/{server_id}", status_code=204)
def remove_server(
    team_id: int,
    server_id: int,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    team = _get_team_or_404(team_id, db)
    ts = db.query(TeamServer).filter(
        TeamServer.team_id == team_id, TeamServer.server_id == server_id
    ).first()
    if not ts:
        raise HTTPException(status_code=404, detail="Server not assigned to this team")

    db.add(AuditLog(
        user_id=current_user.id,
        action="team_server_removed",
        server_id=server_id,
        details=f"Removed server {server_id} from team '{team.name}'",
    ))
    db.delete(ts)
    db.commit()


# ---------------------------------------------------------------------------
# Application assignments
# ---------------------------------------------------------------------------

@router.get("/api/admin/teams/{team_id}/applications")
def list_team_applications(
    team_id: int,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    _get_team_or_404(team_id, db)
    team_apps = db.query(TeamApplication).filter(TeamApplication.team_id == team_id).all()
    return [
        {
            "id": ta.id,
            "application_id": ta.application_id,
            "app_name": ta.application.app_name if ta.application else None,
            "status": ta.application.status.value if ta.application else None,
            "permissions": ta.permissions,
            "assigned_at": ta.assigned_at,
        }
        for ta in team_apps
    ]


@router.post("/api/admin/teams/{team_id}/applications", status_code=201)
def assign_application(
    team_id: int,
    payload: AppAssign,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    team = _get_team_or_404(team_id, db)

    if not db.query(Application).filter(Application.id == payload.application_id).first():
        raise HTTPException(status_code=404, detail="Application not found")

    existing = db.query(TeamApplication).filter(
        TeamApplication.team_id == team_id, TeamApplication.application_id == payload.application_id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Application already assigned to this team")

    ta = TeamApplication(
        team_id=team_id,
        application_id=payload.application_id,
        permissions=payload.permissions,
    )
    db.add(ta)
    db.commit()
    db.refresh(ta)

    db.add(AuditLog(
        user_id=current_user.id,
        action="team_application_assigned",
        details=f"Assigned application {payload.application_id} to team '{team.name}'",
    ))
    db.commit()
    return {
        "id": ta.id,
        "team_id": ta.team_id,
        "application_id": ta.application_id,
        "permissions": ta.permissions,
        "assigned_at": ta.assigned_at,
    }


@router.put("/api/admin/teams/{team_id}/applications/{app_id}")
def update_application_permissions(
    team_id: int,
    app_id: int,
    payload: PermissionUpdate,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    team = _get_team_or_404(team_id, db)
    ta = db.query(TeamApplication).filter(
        TeamApplication.team_id == team_id, TeamApplication.application_id == app_id
    ).first()
    if not ta:
        raise HTTPException(status_code=404, detail="Application not assigned to this team")

    ta.permissions = payload.permissions
    db.commit()
    db.refresh(ta)

    db.add(AuditLog(
        user_id=current_user.id,
        action="team_application_permissions_updated",
        details=f"Updated app {app_id} permissions in team '{team.name}': {payload.permissions}",
    ))
    db.commit()
    return {"team_id": ta.team_id, "application_id": ta.application_id, "permissions": ta.permissions}


@router.delete("/api/admin/teams/{team_id}/applications/{app_id}", status_code=204)
def remove_application(
    team_id: int,
    app_id: int,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    team = _get_team_or_404(team_id, db)
    ta = db.query(TeamApplication).filter(
        TeamApplication.team_id == team_id, TeamApplication.application_id == app_id
    ).first()
    if not ta:
        raise HTTPException(status_code=404, detail="Application not assigned to this team")

    db.add(AuditLog(
        user_id=current_user.id,
        action="team_application_removed",
        details=f"Removed application {app_id} from team '{team.name}'",
    ))
    db.delete(ta)
    db.commit()
