import enum
from datetime import datetime

from sqlalchemy import Column, Integer, DateTime, ForeignKey, UniqueConstraint, Enum as SQLEnum
from sqlalchemy.orm import relationship

from app.database import Base


class TeamMemberRole(str, enum.Enum):
    LEADER = "leader"
    MANAGER = "manager"
    OPERATOR = "operator"
    VIEWER = "viewer"


class TeamMember(Base):
    __tablename__ = "team_members"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    role = Column(SQLEnum(TeamMemberRole), default=TeamMemberRole.VIEWER, nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow)

    team = relationship("Team", back_populates="members")
    user = relationship("User", back_populates="team_memberships")

    __table_args__ = (UniqueConstraint("team_id", "user_id", name="uq_team_member"),)
