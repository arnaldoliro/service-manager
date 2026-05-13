from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.team import Team
from app.models.team_member import TeamMember, TeamMemberRole
from app.models.team_server import TeamServer
from app.models.team_application import TeamApplication
from app.models.server import Server
from app.models.application import Application


class RBACService:
    def __init__(self, db: Session):
        self.db = db

    # -------------------------------------------------------------------------
    # Team membership
    # -------------------------------------------------------------------------

    def get_user_team_memberships(self, user_id: int) -> List[TeamMember]:
        return (
            self.db.query(TeamMember)
            .filter(TeamMember.user_id == user_id)
            .all()
        )

    def get_user_primary_team(self, user_id: int) -> Optional[Team]:
        """Returns the first active team the user belongs to."""
        member = (
            self.db.query(TeamMember)
            .join(Team)
            .filter(TeamMember.user_id == user_id, Team.status == "active")
            .first()
        )
        return member.team if member else None

    def get_user_role_in_team(self, user_id: int, team_id: int) -> Optional[TeamMemberRole]:
        member = (
            self.db.query(TeamMember)
            .filter(TeamMember.user_id == user_id, TeamMember.team_id == team_id)
            .first()
        )
        return member.role if member else None

    def is_team_leader(self, user_id: int, team_id: int) -> bool:
        role = self.get_user_role_in_team(user_id, team_id)
        return role == TeamMemberRole.LEADER

    def can_manage_team(self, user_id: int, team_id: int) -> bool:
        """Leader can manage the team they lead."""
        return self.is_team_leader(user_id, team_id)

    # -------------------------------------------------------------------------
    # Resource access
    # -------------------------------------------------------------------------

    def get_user_team_ids(self, user_id: int) -> List[int]:
        memberships = self.get_user_team_memberships(user_id)
        return [m.team_id for m in memberships]

    def can_view_server(self, user_id: int, server_id: int) -> bool:
        team_ids = self.get_user_team_ids(user_id)
        if not team_ids:
            return False
        ts = (
            self.db.query(TeamServer)
            .filter(TeamServer.server_id == server_id, TeamServer.team_id.in_(team_ids))
            .first()
        )
        if not ts:
            return False
        perms = ts.permissions or {}
        return perms.get("view", True)

    def can_view_application(self, user_id: int, application_id: int) -> bool:
        team_ids = self.get_user_team_ids(user_id)
        if not team_ids:
            return False
        ta = (
            self.db.query(TeamApplication)
            .filter(TeamApplication.application_id == application_id, TeamApplication.team_id.in_(team_ids))
            .first()
        )
        if not ta:
            return False
        perms = ta.permissions or {}
        return perms.get("view", True)

    def can_deploy(self, user_id: int, application_id: int) -> bool:
        team_ids = self.get_user_team_ids(user_id)
        if not team_ids:
            return False
        # Find team that owns this app and get user's role
        for team_id in team_ids:
            ta = (
                self.db.query(TeamApplication)
                .filter(TeamApplication.application_id == application_id, TeamApplication.team_id == team_id)
                .first()
            )
            if not ta:
                continue
            perms = ta.permissions or {}
            if not perms.get("deploy", False):
                continue
            role = self.get_user_role_in_team(user_id, team_id)
            if role in (TeamMemberRole.LEADER, TeamMemberRole.MANAGER):
                return True
        return False

    def can_restart_application(self, user_id: int, application_id: int) -> bool:
        team_ids = self.get_user_team_ids(user_id)
        if not team_ids:
            return False
        for team_id in team_ids:
            ta = (
                self.db.query(TeamApplication)
                .filter(TeamApplication.application_id == application_id, TeamApplication.team_id == team_id)
                .first()
            )
            if not ta:
                continue
            perms = ta.permissions or {}
            if not perms.get("restart", False):
                continue
            role = self.get_user_role_in_team(user_id, team_id)
            if role in (TeamMemberRole.LEADER, TeamMemberRole.MANAGER, TeamMemberRole.OPERATOR):
                return True
        return False

    def check_permission(
        self,
        user_id: int,
        action: str,
        resource_type: str,
        resource_id: int,
    ) -> bool:
        """Generic permission check."""
        if resource_type == "server":
            if action == "view":
                return self.can_view_server(user_id, resource_id)
        elif resource_type == "application":
            if action == "view":
                return self.can_view_application(user_id, resource_id)
            if action == "deploy":
                return self.can_deploy(user_id, resource_id)
            if action in ("start", "stop", "restart"):
                return self.can_restart_application(user_id, resource_id)
        return False

    # -------------------------------------------------------------------------
    # Filtered lists
    # -------------------------------------------------------------------------

    def get_filtered_servers(self, user_id: int) -> List[Server]:
        team_ids = self.get_user_team_ids(user_id)
        if not team_ids:
            return []
        server_ids = [
            ts.server_id
            for ts in self.db.query(TeamServer).filter(TeamServer.team_id.in_(team_ids)).all()
        ]
        if not server_ids:
            return []
        return self.db.query(Server).filter(Server.id.in_(server_ids)).all()

    def get_filtered_applications(self, user_id: int) -> List[Application]:
        team_ids = self.get_user_team_ids(user_id)
        if not team_ids:
            return []
        app_ids = [
            ta.application_id
            for ta in self.db.query(TeamApplication).filter(TeamApplication.team_id.in_(team_ids)).all()
        ]
        if not app_ids:
            return []
        return self.db.query(Application).filter(Application.id.in_(app_ids)).all()
