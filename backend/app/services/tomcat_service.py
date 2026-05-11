import shutil
from pathlib import Path
from app.services.winrm_service import WinRMService, CommandResult


class TomcatService:
    def __init__(self, winrm: WinRMService, tomcat_home: str = "C:\\tomcat"):
        self.winrm = winrm
        self.tomcat_home = tomcat_home

    def get_status(self, service_name: str = "Tomcat9") -> str:
        result = self.winrm.execute_powershell(
            f"(Get-Service -Name '{service_name}').Status"
        )
        if result.success:
            return result.stdout.strip().lower()
        return "unknown"

    def start(self, service_name: str = "Tomcat9") -> CommandResult:
        return self.winrm.execute_powershell(
            f"Start-Service -Name '{service_name}'"
        )

    def stop(self, service_name: str = "Tomcat9") -> CommandResult:
        return self.winrm.execute_powershell(
            f"Stop-Service -Name '{service_name}'"
        )

    def restart(self, service_name: str = "Tomcat9") -> CommandResult:
        return self.winrm.execute_powershell(
            f"Restart-Service -Name '{service_name}'"
        )

    def list_services(self) -> list[dict]:
        result = self.winrm.execute_powershell(
            "Get-Service | Where-Object {$_.Name -like '*tomcat*' -or $_.Name -like '*catalina*'} "
            "| Select-Object Name, Status | ConvertTo-Json"
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
        webapps = f"{self.tomcat_home}\\webapps\\{app_name}.war"
        with open(war_local_path, "rb") as f:
            war_bytes = f.read()

        b64 = __import__("base64").b64encode(war_bytes).decode()
        script = (
            f"$bytes = [Convert]::FromBase64String('{b64}');"
            f"[IO.File]::WriteAllBytes('{webapps}', $bytes)"
        )
        return self.winrm.execute_powershell(script)

    def get_logs(self, lines: int = 200) -> str:
        log_path = f"{self.tomcat_home}\\logs\\catalina.out"
        result = self.winrm.execute_powershell(
            f"Get-Content '{log_path}' -Tail {lines} | Out-String"
        )
        return result.stdout if result.success else result.stderr
