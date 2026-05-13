from datetime import datetime

from sqlalchemy import Column, Integer, DateTime, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base


class TeamApplication(Base):
    __tablename__ = "team_applications"

    id = Column(Integer, primary_key=True, index=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False, index=True)
    permissions = Column(JSON, default=lambda: {"view": True, "deploy": False, "restart": False})
    assigned_at = Column(DateTime, default=datetime.utcnow)

    team = relationship("Team", back_populates="applications")
    application = relationship("Application")

    __table_args__ = (UniqueConstraint("team_id", "application_id", name="uq_team_application"),)
