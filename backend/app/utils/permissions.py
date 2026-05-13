from functools import wraps
from typing import Optional

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.services.security import get_current_user
from app.services.rbac_service import RBACService


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator permission required",
        )
    return current_user


def require_team_membership(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    rbac = RBACService(db)
    team = rbac.get_user_primary_team(current_user.id)
    if not team and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not belong to any team",
        )
    return current_user


class RequireTeamLeader:
    """Dependency that checks the current user is a leader of the given team."""

    def __init__(self, team_id_param: str = "team_id"):
        self.team_id_param = team_id_param

    def __call__(
        self,
        team_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db),
    ) -> User:
        if current_user.is_admin:
            return current_user
        rbac = RBACService(db)
        if not rbac.is_team_leader(current_user.id, team_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Team leader permission required",
            )
        return current_user


def check_resource_access(
    resource_type: str,
    resource_id: int,
    action: str,
    current_user: User,
    db: Session,
) -> None:
    """Raises 403 if the current user cannot perform `action` on `resource_id`."""
    if current_user.is_admin:
        return
    rbac = RBACService(db)
    if not rbac.check_permission(current_user.id, action, resource_type, resource_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Permission denied: cannot {action} this {resource_type}",
        )
