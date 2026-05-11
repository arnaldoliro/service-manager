from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Server(Base):
    __tablename__ = "servers"

    id = Column(Integer, primary_key=True, index=True)
    hostname = Column(String(255), nullable=False)
    username = Column(String(100), nullable=False)
    password = Column(String(255), nullable=False)
    port = Column(Integer, default=8080)
    winrm_port = Column(Integer, default=5985)
    description = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    services = relationship("Service", back_populates="server", cascade="all, delete-orphan")
    deployments = relationship("Deployment", back_populates="server", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="server")
