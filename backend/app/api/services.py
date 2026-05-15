import json
import re
from datetime import datetime
from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, field_validator
from app.database import get_db
from app.models.server import Server
from app.models.service import Service
from app.models.audit_log import AuditLog
from app.models.user import User
from app.services.security import get_current_user
from app.services.winrm_service import WinRMService
from app.services.tomcat_service import TomcatService

router = APIRouter(prefix="/api/servers", tags=["services"])

SERVICE_NAME_PATTERN = r'^[A-Za-z0-9_\-\. ]{1,256}$'
_SERVICE_NAME_RE = re.compile(SERVICE_NAME_PATTERN)


class ServiceResponse(BaseModel):
    id: int
    server_id: int
    service_name: str
    status: str
    memory_mb: Optional[float] = None
    start_mode: Optional[str] = None
    start_time: Optional[str] = None

    @field_validator("start_time", mode="before")
    @classmethod
    def _serialize_dt(cls, v):
        if v is None:
            return None
        return v.isoformat() if hasattr(v, "isoformat") else str(v)

    class Config:
        from_attributes = True


class ServiceCreateRequest(BaseModel):
    service_name: str

    @field_validator("service_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not _SERVICE_NAME_RE.match(v):
            raise ValueError("Nome de serviço inválido")
        return v


class ServiceHistoryEntry(BaseModel):
    id: int
    action: str
    timestamp: Optional[str]
    username: Optional[str]


class ServiceDetailResponse(BaseModel):
    service_name: str
    status: str
    description: Optional[str]
    path: Optional[str]
    pid: Optional[int]
    start_mode: Optional[str]
    start_time: Optional[str]
    memory_mb: Optional[float]
    cpu_seconds: Optional[float]
    history: list[ServiceHistoryEntry]
    data_source: str  # "live" = WinRM ao vivo | "db" = fallback do banco


class DiscoveredServiceResponse(BaseModel):
    name: str
    display_name: str
    status: str
    start_mode: Optional[str] = None
    path: Optional[str] = None
    memory_mb: Optional[float] = None
    start_time: Optional[str] = None
    already_added: bool = False


# Terms searched in Name, DisplayName and PathName during service discovery
_DISCOVER_TERMS = ["tomcat", "catalina", "webrun"]


def _get_server_or_404(server_id: int, db: Session) -> Server:
    server = db.query(Server).filter(Server.id == server_id).first()
    if not server:
        raise HTTPException(status_code=404, detail="Servidor não encontrado")
    return server


@router.get("/{server_id}/services", response_model=list[ServiceResponse])
def list_services(
    server_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_server_or_404(server_id, db)
    return db.query(Service).filter(Service.server_id == server_id).all()


@router.post("/{server_id}/services", response_model=ServiceResponse, status_code=status.HTTP_201_CREATED)
def create_service(
    server_id: int,
    body: ServiceCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_server_or_404(server_id, db)
    existing = db.query(Service).filter(
        Service.server_id == server_id,
        Service.service_name == body.service_name,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Serviço já existe na lista")
    svc = Service(server_id=server_id, service_name=body.service_name, status="unknown")
    db.add(svc)
    db.commit()
    db.refresh(svc)
    return svc


@router.delete("/{server_id}/services/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_service(
    server_id: int,
    service_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_server_or_404(server_id, db)
    svc = db.query(Service).filter(
        Service.id == service_id,
        Service.server_id == server_id,
    ).first()
    if not svc:
        raise HTTPException(status_code=404, detail="Serviço não encontrado")
    db.delete(svc)
    db.commit()


@router.get("/{server_id}/services/{service_name}/detail", response_model=ServiceDetailResponse)
def get_service_detail(
    server_id: int,
    service_name: Annotated[str, Path(pattern=SERVICE_NAME_PATTERN)],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    server = _get_server_or_404(server_id, db)

    detail: dict = {
        "service_name": service_name,
        "status": "unknown",
        "description": None,
        "path": None,
        "pid": None,
        "start_mode": None,
        "start_time": None,
        "memory_mb": None,
        "cpu_seconds": None,
        "data_source": "db",
    }

    winrm_ok = False
    try:
        winrm = WinRMService(server.hostname, server.username, server.password, server.winrm_port)
        # Get-CimInstance is the modern replacement for Get-WmiObject — typically
        # 3-5× faster because it uses DCOM/WinRM natively instead of old WMI RPC.
        script = (
            f"$ErrorActionPreference='SilentlyContinue';"
            f"$n='{service_name}';"
            f"$c=Get-CimInstance -ClassName Win32_Service -Filter \"Name='$n'\";"
            f"if($c){{"
            f"$r=@{{name=$c.Name;status=$c.State;description=$c.Description;"
            f"path=$c.PathName;pid=[int]$c.ProcessId;start_mode=$c.StartMode;"
            f"start_time=$null;memory_mb=$null;cpu_seconds=$null}};"
            f"if($c.ProcessId -gt 0){{"
            f"$p=Get-Process -Id $c.ProcessId -ErrorAction SilentlyContinue;"
            f"if($p){{"
            f"$r.start_time=$p.StartTime.ToString('o');"
            f"$r.memory_mb=[math]::Round($p.WorkingSet64/1MB,2);"
            f"$r.cpu_seconds=[math]::Round($p.TotalProcessorTime.TotalSeconds,2);}}}}"
            f"$r|ConvertTo-Json -Depth 2}}"
        )
        result = winrm.execute_powershell(script)
        if result.success and result.stdout.strip():
            data = json.loads(result.stdout)
            detail.update({
                "status": str(data.get("status") or "unknown").lower(),
                "description": data.get("description") or None,
                "path": data.get("path") or None,
                "pid": int(data["pid"]) if data.get("pid") else None,
                "start_mode": data.get("start_mode") or None,
                "start_time": data.get("start_time") or None,
                "memory_mb": data.get("memory_mb"),
                "cpu_seconds": data.get("cpu_seconds"),
                "data_source": "live",
            })
            winrm_ok = True
    except Exception:
        pass

    if not winrm_ok:
        # Fallback: use DB status so at least something is shown
        svc = db.query(Service).filter(
            Service.server_id == server_id,
            Service.service_name == service_name,
        ).first()
        if svc:
            detail["status"] = svc.status
        detail["data_source"] = "db"

    # Last 5 audit entries for this service
    history = []
    entries = (
        db.query(AuditLog)
        .filter(
            AuditLog.server_id == server_id,
            AuditLog.action.contains(service_name),
        )
        .order_by(AuditLog.timestamp.desc())
        .limit(5)
        .all()
    )
    for entry in entries:
        username = None
        if entry.user_id:
            u = db.query(User).filter(User.id == entry.user_id).first()
            username = u.username if u else None
        history.append({
            "id": entry.id,
            "action": entry.action,
            "timestamp": entry.timestamp.isoformat() if entry.timestamp else None,
            "username": username,
        })

    detail["history"] = history
    return detail


@router.post("/{server_id}/services/sync")
def sync_services(
    server_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update status/metrics only for services already registered by the user."""
    server = _get_server_or_404(server_id, db)
    db_services = db.query(Service).filter(Service.server_id == server_id).all()

    if not db_services:
        return {"synced": 0}

    winrm = WinRMService(server.hostname, server.username, server.password, server.winrm_port)
    names_csv = ",".join(f"'{s.service_name}'" for s in db_services)
    script = (
        "$ErrorActionPreference='SilentlyContinue';"
        f"$names=@({names_csv});"
        "$out=$names|ForEach-Object{"
        "$n=$_;"
        "$c=Get-CimInstance -ClassName Win32_Service -Filter \"Name='$n'\" -ErrorAction SilentlyContinue;"
        "if($c){"
        "$r=@{name=$c.Name;status=$c.State.ToLower();start_mode=$c.StartMode;memory_mb=$null;start_time=$null};"
        "if($c.ProcessId -gt 0){"
        "$p=Get-Process -Id $c.ProcessId -ErrorAction SilentlyContinue;"
        "if($p){"
        "$r.memory_mb=[math]::Round($p.WorkingSet64/1MB,2);"
        "$r.start_time=$p.StartTime.ToString('o')}};$r}};"
        "$out|ConvertTo-Json -Depth 2"
    )
    result = winrm.execute_powershell(script)

    if not result.success:
        raise HTTPException(
            status_code=503,
            detail="Não foi possível conectar ao servidor via WinRM.",
        )

    db_map = {s.service_name: s for s in db_services}
    updated: set[str] = set()

    if result.stdout.strip():
        try:
            data = json.loads(result.stdout)
            for svc in ([data] if isinstance(data, dict) else data):
                name = svc.get("name")
                if not name or name not in db_map:
                    continue
                start_time = None
                if svc.get("start_time"):
                    try:
                        start_time = datetime.fromisoformat(svc["start_time"])
                    except Exception:
                        pass
                entry = db_map[name]
                entry.status = str(svc.get("status", "unknown")).lower()
                entry.memory_mb = svc.get("memory_mb")
                entry.start_mode = svc.get("start_mode") or None
                entry.start_time = start_time
                updated.add(name)
        except Exception:
            pass

    # Services not found on the remote server → mark as unknown
    for name, svc in db_map.items():
        if name not in updated:
            svc.status = "unknown"

    db.commit()
    return {"synced": len(db_services)}


@router.post("/{server_id}/services/discover", response_model=list[DiscoveredServiceResponse])
def discover_services(
    server_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Scan the remote server for Tomcat/Catalina/Webrun services not yet registered."""
    server = _get_server_or_404(server_id, db)
    winrm = WinRMService(server.hostname, server.username, server.password, server.winrm_port)

    conditions = " -or ".join(
        f"($_.Name -like '*{t}*' -or $_.DisplayName -like '*{t}*'"
        f" -or ($_.PathName -and $_.PathName -like '*{t}*'))"
        for t in _DISCOVER_TERMS
    )
    script = (
        "$ErrorActionPreference='SilentlyContinue';"
        "$all=Get-CimInstance -ClassName Win32_Service;"
        f"$found=$all|Where-Object{{{conditions}}};"
        "$out=$found|ForEach-Object{"
        "$r=@{name=$_.Name;display_name=$_.DisplayName;status=$_.State.ToLower();"
        "start_mode=$_.StartMode;path=$_.PathName;memory_mb=$null;start_time=$null};"
        "if($_.ProcessId -gt 0){"
        "$p=Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue;"
        "if($p){"
        "$r.memory_mb=[math]::Round($p.WorkingSet64/1MB,2);"
        "$r.start_time=$p.StartTime.ToString('o')}};$r};"
        "$out|ConvertTo-Json -Depth 2"
    )
    result = winrm.execute_powershell(script)

    if not result.success:
        raise HTTPException(
            status_code=503,
            detail="Não foi possível conectar ao servidor via WinRM.",
        )

    existing = {
        s.service_name
        for s in db.query(Service).filter(Service.server_id == server_id).all()
    }

    discovered: list[DiscoveredServiceResponse] = []
    if result.stdout.strip():
        try:
            data = json.loads(result.stdout)
            for svc in ([data] if isinstance(data, dict) else data):
                name = svc.get("name", "")
                if not name:
                    continue
                discovered.append(DiscoveredServiceResponse(
                    name=name,
                    display_name=svc.get("display_name") or name,
                    status=str(svc.get("status", "unknown")).lower(),
                    start_mode=svc.get("start_mode") or None,
                    path=svc.get("path") or None,
                    memory_mb=svc.get("memory_mb"),
                    start_time=svc.get("start_time") or None,
                    already_added=name in existing,
                ))
        except Exception:
            raise HTTPException(status_code=500, detail="Erro ao processar resposta do servidor")

    return discovered


def _update_service_status(db: Session, server_id: int, service_name: str, status: str) -> None:
    svc = db.query(Service).filter(
        Service.server_id == server_id,
        Service.service_name == service_name,
    ).first()
    if svc:
        svc.status = status


@router.post("/{server_id}/services/{service_name}/start")
def start_service(
    server_id: int,
    service_name: Annotated[str, Path(pattern=SERVICE_NAME_PATTERN)],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    server = _get_server_or_404(server_id, db)
    winrm = WinRMService(server.hostname, server.username, server.password, server.winrm_port)
    result = TomcatService(winrm).start(service_name)

    if not result.success:
        raise HTTPException(status_code=500, detail="Service start failed")

    _update_service_status(db, server_id, service_name, "running")
    db.add(AuditLog(user_id=current_user.id, server_id=server_id, action=f"service_start:{service_name}"))
    db.commit()
    return {"status": "started", "output": result.stdout}


@router.post("/{server_id}/services/{service_name}/stop")
def stop_service(
    server_id: int,
    service_name: Annotated[str, Path(pattern=SERVICE_NAME_PATTERN)],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    server = _get_server_or_404(server_id, db)
    winrm = WinRMService(server.hostname, server.username, server.password, server.winrm_port)
    result = TomcatService(winrm).stop(service_name)

    if not result.success:
        raise HTTPException(status_code=500, detail="Service stop failed")

    _update_service_status(db, server_id, service_name, "stopped")
    db.add(AuditLog(user_id=current_user.id, server_id=server_id, action=f"service_stop:{service_name}"))
    db.commit()
    return {"status": "stopped", "output": result.stdout}


@router.post("/{server_id}/services/{service_name}/restart")
def restart_service(
    server_id: int,
    service_name: Annotated[str, Path(pattern=SERVICE_NAME_PATTERN)],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    server = _get_server_or_404(server_id, db)
    winrm = WinRMService(server.hostname, server.username, server.password, server.winrm_port)
    result = TomcatService(winrm).restart(service_name)

    if not result.success:
        raise HTTPException(status_code=500, detail="Service restart failed")

    _update_service_status(db, server_id, service_name, "running")
    db.add(AuditLog(user_id=current_user.id, server_id=server_id, action=f"service_restart:{service_name}"))
    db.commit()
    return {"status": "restarted", "output": result.stdout}
