from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.service import Service
from app.models.user import User
from app.services.security import get_current_user
from app.services.rbac_service import RBACService

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/active-services-count")
def active_services_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.is_admin:
        count = db.query(Service).filter(Service.status == "running").count()
    else:
        servers = RBACService(db).get_filtered_servers(current_user.id)
        if not servers:
            return {"active_services": 0}
        server_ids = [s.id for s in servers]
        count = (
            db.query(Service)
            .filter(Service.server_id.in_(server_ids), Service.status == "running")
            .count()
        )
    return {"active_services": count}
