from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class ApplicationStatus(str, enum.Enum):
    RUNNING = "running"
    STOPPED = "stopped"
    DEPLOYING = "deploying"
    FAILED = "failed"


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    server_id = Column(Integer, ForeignKey("servers.id"), nullable=False)
    app_name = Column(String(128), nullable=False)
    jar_name = Column(String(128), nullable=False)
    context_name = Column(String(128), nullable=False)
    tomcat_home = Column(String(256), nullable=False)
    tomcat_service_name = Column(String(64), nullable=False)
    current_version = Column(String(32), nullable=True)
    status = Column(SQLEnum(ApplicationStatus), default=ApplicationStatus.STOPPED)
    last_deployed = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    server = relationship("Server", back_populates="applications")
    deployments = relationship("Deployment", back_populates="application", cascade="all, delete-orphan")
