from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    server_id = Column(Integer, ForeignKey("servers.id"), nullable=False)
    service_name = Column(String(255), nullable=False)
    status = Column(String(50), default="unknown")
    memory_mb = Column(Float, nullable=True)
    start_mode = Column(String(50), nullable=True)
    start_time = Column(DateTime(timezone=True), nullable=True)
    last_checked = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    server = relationship("Server", back_populates="services")
