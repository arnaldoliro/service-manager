from sqlalchemy import Boolean, Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.types import TypeDecorator
from app.database import Base


class EncryptedString(TypeDecorator):
    """Transparently encrypts/decrypts string values in the database."""
    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        from app.utils.encryption import get_encryption_manager
        return get_encryption_manager().encrypt(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        try:
            from app.utils.encryption import get_encryption_manager
            return get_encryption_manager().decrypt(value)
        except Exception:
            return None


class Server(Base):
    __tablename__ = "servers"

    id = Column(Integer, primary_key=True, index=True)
    hostname = Column(String(255), nullable=False)
    name = Column(String(255), nullable=True)
    username = Column(String(100), nullable=False)
    password = Column(EncryptedString(255), nullable=False)
    winrm_port = Column(Integer, default=5985)
    description = Column(String(500), nullable=True)
    visible = Column(Boolean, default=True, nullable=False, server_default="true")
    status = Column(String(32), default="unknown", server_default="unknown")
    memory_available = Column(Integer, nullable=True)
    memory_total = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    services = relationship("Service", back_populates="server", cascade="all, delete-orphan")
    deployments = relationship("Deployment", back_populates="server", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="server", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="server")
