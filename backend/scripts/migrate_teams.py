"""
Migration script for Teams & RBAC feature.
Run from backend/ directory:
    python scripts/migrate_teams.py
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import engine, Base
from app.models import (  # noqa: F401 — imports register all models with Base
    User, Server, Service, Deployment, AuditLog, Application,
    Team, TeamMember, TeamServer, TeamApplication,
)


def run():
    with engine.connect() as conn:
        # Add role column to users if not already present
        result = conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='users' AND column_name='role'"
        ))
        if not result.fetchone():
            conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(32) DEFAULT 'user'"))
            print("Added role column to users table")
        else:
            print("role column already exists in users table")

        # Add team_id column to audit_logs if not already present
        result = conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name='audit_logs' AND column_name='team_id'"
        ))
        if not result.fetchone():
            conn.execute(text(
                "ALTER TABLE audit_logs ADD COLUMN team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL"
            ))
            print("Added team_id column to audit_logs table")
        else:
            print("team_id column already exists in audit_logs table")

        conn.commit()

    # Create all new tables (no-op for tables that already exist)
    Base.metadata.create_all(bind=engine)
    print("Created teams, team_members, team_servers, team_applications tables (if not existing)")
    print("Migration complete.")


if __name__ == "__main__":
    run()
