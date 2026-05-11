from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Deployment(Base):
    __tablename__ = "deployments"

    id = Column(Integer, primary_key=True, index=True)
    server_id = Column(Integer, ForeignKey("servers.id"), nullable=False)
    app_name = Column(String(255), nullable=False)
    war_file = Column(String(500), nullable=False)
    status = Column(String(50), default="pending")
    output = Column(Text, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    server = relationship("Server", back_populates="deployments")
