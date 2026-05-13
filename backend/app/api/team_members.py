from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AuditLog, Team, TeamMember, User
from app.models.team_member import TeamMemberRole
from app.services.security import get_current_user, get_admin_user
from app.services.rbac_service import RBACService

router = APIRouter(tags=["team-members"])


class MemberAdd(BaseModel):
    user_id: int
    role: TeamMemberRole = TeamMemberRole.VIEWER


class MemberUpdate(BaseModel):
    role: TeamMemberRole


def _get_team_or_404(team_id: int, db: Session) -> Team:
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


def _get_member_or_404(team_id: int, user_id: int, db: Session) -> TeamMember:
    member = db.query(TeamMember).filter(
        TeamMember.team_id == team_id, TeamMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found in this team")
    return member


def _member_response(m: TeamMember) -> dict:
    return {
        "id": m.id,
        "team_id": m.team_id,
        "user_id": m.user_id,
        "username": m.user.username if m.user else None,
        "email": m.user.email if m.user else None,
        "role": m.role.value,
        "joined_at": m.joined_at,
    }


# ---------------------------------------------------------------------------
# Admin: manage any team's members
# ---------------------------------------------------------------------------

@router.get("/api/admin/teams/{team_id}/members")
def list_members(
    team_id: int,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    _get_team_or_404(team_id, db)
    members = db.query(TeamMember).filter(TeamMember.team_id == team_id).all()
    return [_member_response(m) for m in members]


@router.post("/api/admin/teams/{team_id}/members", status_code=201)
def add_member(
    team_id: int,
    payload: MemberAdd,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    team = _get_team_or_404(team_id, db)

    if not db.query(User).filter(User.id == payload.user_id).first():
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.query(TeamMember).filter(
        TeamMember.team_id == team_id, TeamMember.user_id == payload.user_id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="User is already a member of this team")

    member = TeamMember(team_id=team_id, user_id=payload.user_id, role=payload.role)
    db.add(member)
    db.commit()
    db.refresh(member)

    db.add(AuditLog(
        user_id=current_user.id,
        action="team_member_added",
        details=f"Added user {payload.user_id} to team '{team.name}' as {payload.role.value}",
    ))
    db.commit()
    return _member_response(member)


@router.put("/api/admin/teams/{team_id}/members/{user_id}")
def update_member_role(
    team_id: int,
    user_id: int,
    payload: MemberUpdate,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    team = _get_team_or_404(team_id, db)
    member = _get_member_or_404(team_id, user_id, db)

    old_role = member.role.value
    member.role = payload.role
    db.commit()
    db.refresh(member)

    db.add(AuditLog(
        user_id=current_user.id,
        action="team_member_role_changed",
        details=f"Changed user {user_id} role from {old_role} to {payload.role.value} in team '{team.name}'",
    ))
    db.commit()
    return _member_response(member)


@router.delete("/api/admin/teams/{team_id}/members/{user_id}", status_code=204)
def remove_member(
    team_id: int,
    user_id: int,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    team = _get_team_or_404(team_id, db)
    member = _get_member_or_404(team_id, user_id, db)

    db.add(AuditLog(
        user_id=current_user.id,
        action="team_member_removed",
        details=f"Removed user {user_id} from team '{team.name}'",
    ))
    db.delete(member)
    db.commit()


# ---------------------------------------------------------------------------
# My-team: leader manages their own team's members
# ---------------------------------------------------------------------------

@router.get("/api/my-team/members")
def list_my_team_members(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rbac = RBACService(db)
    team = rbac.get_user_primary_team(current_user.id)
    if not team:
        raise HTTPException(status_code=404, detail="User is not part of any team")
    members = db.query(TeamMember).filter(TeamMember.team_id == team.id).all()
    return [_member_response(m) for m in members]


@router.put("/api/my-team/members/{user_id}")
def update_my_team_member_role(
    user_id: int,
    payload: MemberUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rbac = RBACService(db)
    team = rbac.get_user_primary_team(current_user.id)
    if not team:
        raise HTTPException(status_code=404, detail="User is not part of any team")
    if not rbac.is_team_leader(current_user.id, team.id) and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only team leaders can change member roles")

    member = _get_member_or_404(team.id, user_id, db)

    # Leader cannot demote another leader (only admin can)
    if member.role == TeamMemberRole.LEADER and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Cannot change role of another team leader")

    old_role = member.role.value
    member.role = payload.role
    db.commit()
    db.refresh(member)

    db.add(AuditLog(
        user_id=current_user.id,
        action="team_member_role_changed",
        details=f"Leader changed user {user_id} role from {old_role} to {payload.role.value} in team '{team.name}'",
    ))
    db.commit()
    return _member_response(member)


@router.delete("/api/my-team/members/{user_id}", status_code=204)
def remove_my_team_member(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rbac = RBACService(db)
    team = rbac.get_user_primary_team(current_user.id)
    if not team:
        raise HTTPException(status_code=404, detail="User is not part of any team")
    if not rbac.is_team_leader(current_user.id, team.id) and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Only team leaders can remove members")

    member = _get_member_or_404(team.id, user_id, db)
    if member.role == TeamMemberRole.LEADER and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Cannot remove another leader; contact admin")

    db.add(AuditLog(
        user_id=current_user.id,
        action="team_member_removed",
        details=f"Leader removed user {user_id} from team '{team.name}'",
    ))
    db.delete(member)
    db.commit()
