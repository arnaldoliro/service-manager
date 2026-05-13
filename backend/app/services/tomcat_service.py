import re
import base64
from app.services.winrm_service import WinRMService, CommandResult

_SERVICE_NAME_RE = re.compile(r'^[A-Za-z0-9_\-\.]{1,256}$')
_APP_NAME_RE = re.compile(r'^[A-Za-z0-9_\-]{1,128}$')


def _validate_service_name(name: str) -> str:
    if not _SERVICE_NAME_RE.match(name):
        raise ValueError("Invalid service name: contains disallowed characters")
    return name


def _validate_app_name(name: str) -> str:
    if not _APP_NAME_RE.match(name):
        raise ValueError("Invalid app name: contains disallowed characters")
    return name


class TomcatService:
    def __init__(self, winrm: WinRMService, tomcat_home: str = "C:\\tomcat"):
        self.winrm = winrm
        self.tomcat_home = tomcat_home

    def get_status(self, service_name: str = "Tomcat9") -> str:
        name = _validate_service_name(service_name)
        script = f'$svc = "{name}"; (Get-Service -Name $svc).Status'
        result = self.winrm.execute_powershell(script)
        if result.success:
            return result.stdout.strip().lower()
        return "unknown"

    def start(self, service_name: str = "Tomcat9") -> CommandResult:
        name = _validate_service_name(service_name)
        script = f'$svc = "{name}"; Start-Service -Name $svc'
        return self.winrm.execute_powershell(script)

    def stop(self, service_name: str = "Tomcat9") -> CommandResult:
        name = _validate_service_name(service_name)
        script = f'$svc = "{name}"; Stop-Service -Name $svc'
        return self.winrm.execute_powershell(script)

    def restart(self, service_name: str = "Tomcat9") -> CommandResult:
        name = _validate_service_name(service_name)
        script = f'$svc = "{name}"; Restart-Service -Name $svc'
        return self.winrm.execute_powershell(script)

    def list_services(self) -> list[dict]:
        result = self.winrm.execute_powershell(
            "Get-Service | Where-Object {$_.Name -like '*tomcat*' -or $_.Name -like '*catalina*'} "
            "| Select-Object Name, @{N='Status';E={$_.Status.ToString()}} | ConvertTo-Json"
        )
        if result.success and result.stdout.strip():
            import json
            try:
                data = json.loads(result.stdout)
                if isinstance(data, dict):
                    data = [data]
                return [{"name": s["Name"], "status": s["Status"]} for s in data]
            except json.JSONDecodeError:
                pass
        return []

    def deploy_war(self, war_local_path: str, app_name: str) -> CommandResult:
        name = _validate_app_name(app_name)
        webapps = f"{self.tomcat_home}\\webapps\\{name}.war"
        with open(war_local_path, "rb") as f:
            war_bytes = f.read()

        b64 = base64.b64encode(war_bytes).decode()
        script = (
            f'$dest = "{webapps}";'
            f"$bytes = [Convert]::FromBase64String('{b64}');"
            f'[IO.File]::WriteAllBytes($dest, $bytes)'
        )
        return self.winrm.execute_powershell(script)

    def get_logs(self, lines: int = 200) -> str:
        log_path = f"{self.tomcat_home}\\logs\\catalina.out"
        result = self.winrm.execute_powershell(
            f"Get-Content '{log_path}' -Tail {lines} | Out-String"
        )
        return result.stdout if result.success else result.stderr
