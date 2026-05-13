from datetime import datetime

from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship

from app.database import Base


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(128), unique=True, nullable=False, index=True)
    description = Column(String(512), nullable=True)
    leader_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(32), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    servers = relationship("TeamServer", back_populates="team", cascade="all, delete-orphan")
    applications = relationship("TeamApplication", back_populates="team", cascade="all, delete-orphan")
    leader = relationship("User", foreign_keys=[leader_id], back_populates="led_teams")
