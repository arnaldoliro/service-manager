from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AuditLog, Team, TeamMember, TeamServer, TeamApplication, User
from app.models.team_member import TeamMemberRole
from app.services.security import get_current_user, get_admin_user
from app.services.rbac_service import RBACService

router = APIRouter(tags=["teams"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class TeamCreate(BaseModel):
    name: str
    description: Optional[str] = None
    leader_id: Optional[int] = None


class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    leader_id: Optional[int] = None
    status: Optional[str] = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_team_or_404(team_id: int, db: Session) -> Team:
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


def _team_detail(team: Team, db: Session) -> dict:
    member_count = db.query(TeamMember).filter(TeamMember.team_id == team.id).count()
    return {
        "id": team.id,
        "name": team.name,
        "description": team.description,
        "status": team.status,
        "leader_id": team.leader_id,
        "leader": (
            {"id": team.leader.id, "username": team.leader.username}
            if team.leader else None
        ),
        "member_count": member_count,
        "created_at": team.created_at,
        "updated_at": team.updated_at,
    }


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------

@router.get("/api/admin/teams")
def list_teams(
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    teams = db.query(Team).all()
    return [_team_detail(t, db) for t in teams]


@router.post("/api/admin/teams", status_code=201)
def create_team(
    payload: TeamCreate,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    if db.query(Team).filter(Team.name == payload.name).first():
        raise HTTPException(status_code=409, detail="Team name already exists")

    team = Team(
        name=payload.name,
        description=payload.description,
        leader_id=payload.leader_id,
    )
    db.add(team)
    db.commit()
    db.refresh(team)

    # If leader_id provided, auto-add as LEADER member
    if payload.leader_id:
        existing = db.query(TeamMember).filter(
            TeamMember.team_id == team.id, TeamMember.user_id == payload.leader_id
        ).first()
        if not existing:
            db.add(TeamMember(team_id=team.id, user_id=payload.leader_id, role=TeamMemberRole.LEADER))
            db.commit()

    db.add(AuditLog(
        user_id=current_user.id,
        action="team_created",
        details=f"Created team '{team.name}' (id={team.id})",
    ))
    db.commit()
    return _team_detail(team, db)


@router.get("/api/admin/teams/{team_id}")
def get_team(
    team_id: int,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    team = _get_team_or_404(team_id, db)
    detail = _team_detail(team, db)

    members = db.query(TeamMember).filter(TeamMember.team_id == team_id).all()
    detail["members"] = [
        {
            "user_id": m.user_id,
            "username": m.user.username if m.user else None,
            "role": m.role.value,
            "joined_at": m.joined_at,
        }
        for m in members
    ]

    servers = db.query(TeamServer).filter(TeamServer.team_id == team_id).all()
    detail["servers"] = [
        {
            "server_id": ts.server_id,
            "hostname": ts.server.hostname if ts.server else None,
            "permissions": ts.permissions,
            "assigned_at": ts.assigned_at,
        }
        for ts in servers
    ]

    apps = db.query(TeamApplication).filter(TeamApplication.team_id == team_id).all()
    detail["applications"] = [
        {
            "application_id": ta.application_id,
            "app_name": ta.application.app_name if ta.application else None,
            "permissions": ta.permissions,
            "assigned_at": ta.assigned_at,
        }
        for ta in apps
    ]

    return detail


@router.put("/api/admin/teams/{team_id}")
def update_team(
    team_id: int,
    payload: TeamUpdate,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    team = _get_team_or_404(team_id, db)

    if payload.name and payload.name != team.name:
        if db.query(Team).filter(Team.name == payload.name).first():
            raise HTTPException(status_code=409, detail="Team name already exists")
        team.name = payload.name

    if payload.description is not None:
        team.description = payload.description
    if payload.leader_id is not None:
        team.leader_id = payload.leader_id
    if payload.status is not None:
        team.status = payload.status

    db.commit()
    db.refresh(team)

    db.add(AuditLog(
        user_id=current_user.id,
        action="team_updated",
        details=f"Updated team '{team.name}' (id={team.id})",
    ))
    db.commit()
    return _team_detail(team, db)


@router.delete("/api/admin/teams/{team_id}", status_code=204)
def delete_team(
    team_id: int,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    team = _get_team_or_404(team_id, db)
    db.add(AuditLog(
        user_id=current_user.id,
        action="team_deleted",
        details=f"Deleted team '{team.name}' (id={team.id})",
    ))
    db.delete(team)
    db.commit()


# ---------------------------------------------------------------------------
# My-team endpoints (any authenticated member)
# ---------------------------------------------------------------------------

@router.get("/api/my-team")
def get_my_team(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rbac = RBACService(db)
    team = rbac.get_user_primary_team(current_user.id)
    if not team:
        raise HTTPException(status_code=404, detail="User is not part of any team")
    return _team_detail(team, db)


@router.get("/api/my-team/servers")
def get_my_team_servers(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rbac = RBACService(db)
    team = rbac.get_user_primary_team(current_user.id)
    if not team:
        raise HTTPException(status_code=404, detail="User is not part of any team")
    servers = db.query(TeamServer).filter(TeamServer.team_id == team.id).all()
    return [
        {
            "server_id": ts.server_id,
            "hostname": ts.server.hostname if ts.server else None,
            "description": ts.server.description if ts.server else None,
            "permissions": ts.permissions,
        }
        for ts in servers
    ]


@router.get("/api/my-team/applications")
def get_my_team_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rbac = RBACService(db)
    team = rbac.get_user_primary_team(current_user.id)
    if not team:
        raise HTTPException(status_code=404, detail="User is not part of any team")
    apps = db.query(TeamApplication).filter(TeamApplication.team_id == team.id).all()
    return [
        {
            "application_id": ta.application_id,
            "app_name": ta.application.app_name if ta.application else None,
            "status": ta.application.status.value if ta.application else None,
            "permissions": ta.permissions,
        }
        for ta in apps
    ]


@router.get("/api/my-team/activity")
def get_my_team_activity(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rbac = RBACService(db)
    team = rbac.get_user_primary_team(current_user.id)
    if not team:
        raise HTTPException(status_code=404, detail="User is not part of any team")

    # Check leader/admin permission for audit
    role = rbac.get_user_role_in_team(current_user.id, team.id)
    if role not in (None,) and role.value not in ("leader",) and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only team leaders can view team activity")

    member_ids = [m.user_id for m in db.query(TeamMember).filter(TeamMember.team_id == team.id).all()]
    logs = (
        db.query(AuditLog)
        .filter(AuditLog.user_id.in_(member_ids))
        .order_by(AuditLog.timestamp.desc())
        .limit(100)
        .all()
    )
    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "username": log.user.username if log.user else None,
            "action": log.action,
            "details": log.details,
            "timestamp": log.timestamp,
        }
        for log in logs
    ]
