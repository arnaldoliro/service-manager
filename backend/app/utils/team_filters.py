from typing import Dict, List

from sqlalchemy.orm import Session

from app.models.team_member import TeamMember
from app.models.team_server import TeamServer
from app.models.team_application import TeamApplication
from app.models.user import User
from app.models.server import Server
from app.models.application import Application


def filter_servers_by_team(user_id: int, db: Session) -> List[Server]:
    team_ids = [
        m.team_id
        for m in db.query(TeamMember).filter(TeamMember.user_id == user_id).all()
    ]
    if not team_ids:
        return []
    server_ids = [
        ts.server_id
        for ts in db.query(TeamServer).filter(TeamServer.team_id.in_(team_ids)).all()
    ]
    if not server_ids:
        return []
    return db.query(Server).filter(Server.id.in_(server_ids)).all()


def filter_applications_by_team(user_id: int, db: Session) -> List[Application]:
    team_ids = [
        m.team_id
        for m in db.query(TeamMember).filter(TeamMember.user_id == user_id).all()
    ]
    if not team_ids:
        return []
    app_ids = [
        ta.application_id
        for ta in db.query(TeamApplication).filter(TeamApplication.team_id.in_(team_ids)).all()
    ]
    if not app_ids:
        return []
    return db.query(Application).filter(Application.id.in_(app_ids)).all()


def get_team_members(team_id: int, db: Session) -> List[User]:
    members = db.query(TeamMember).filter(TeamMember.team_id == team_id).all()
    return [m.user for m in members]


def build_permission_matrix(team_id: int, db: Session) -> Dict:
    servers = db.query(TeamServer).filter(TeamServer.team_id == team_id).all()
    apps = db.query(TeamApplication).filter(TeamApplication.team_id == team_id).all()
    return {
        "servers": {ts.server_id: ts.permissions for ts in servers},
        "applications": {ta.application_id: ta.permissions for ta in apps},
    }
