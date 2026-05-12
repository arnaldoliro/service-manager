from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Deployment(Base):
    __tablename__ = "deployments"

    id = Column(Integer, primary_key=True, index=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=True)
    server_id = Column(Integer, ForeignKey("servers.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    jar_filename = Column(String(256), nullable=True)
    version = Column(String(32), nullable=True)
    status = Column(String(50), default="pending")
    deployment_steps = Column(Text, nullable=True)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    application = relationship("Application", back_populates="deployments")
    server = relationship("Server", back_populates="deployments")
    user = relationship("User")
