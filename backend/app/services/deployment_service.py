import base64
from typing import List, Dict, Any
from enum import Enum

from app.services.winrm_service import WinRMService
from app.models.application import Application


class StepStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    SUCCESS = "success"
    FAILED = "failed"


class DeploymentStep:
    def __init__(self, name: str):
        self.name = name
        self.status = StepStatus.PENDING
        self.output = ""
        self.error = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "status": self.status.value,
            "output": self.output,
            "error": self.error,
        }


class DeploymentService:
    """Orchestrates the complete JAR deployment workflow."""

    def __init__(self, winrm_service: WinRMService, application: Application):
        self.winrm = winrm_service
        self.app = application
        self.steps: List[DeploymentStep] = []

    def deploy(self, jar_bytes: bytes, version: str = None) -> Dict[str, Any]:
        workflow = [
            ("Stop Tomcat", self._stop_tomcat),
            ("Clean work folder", self._clean_work),
            ("Clean temp folder", self._clean_temp),
            ("Remove old context", self._remove_context),
            ("Remove old JAR", self._remove_old_jar),
            ("Upload new JAR", lambda: self._upload_jar(jar_bytes)),
            ("Start Tomcat", self._start_tomcat),
            ("Validate deployment", self._validate_deployment),
        ]

        for step_name, step_func in workflow:
            step = DeploymentStep(step_name)
            self.steps.append(step)
            step.status = StepStatus.IN_PROGRESS

            try:
                step.output = step_func()
                step.status = StepStatus.SUCCESS
            except Exception as e:
                step.error = str(e)
                step.status = StepStatus.FAILED
                self._rollback()
                return {
                    "success": False,
                    "error": f"Deployment failed at step: {step_name}",
                    "steps": [s.to_dict() for s in self.steps],
                }

        return {
            "success": True,
            "message": "Deployment completed successfully",
            "version": version,
            "steps": [s.to_dict() for s in self.steps],
        }

    def _stop_tomcat(self) -> str:
        svc = self.app.tomcat_service_name
        script = f'$svc = "{svc}"; Stop-Service -LiteralName $svc -Force -ErrorAction Stop'
        result = self.winrm.execute_powershell(script)
        if not result.success:
            raise Exception("Failed to stop Tomcat service")
        return f"Stopped {svc}"

    def _clean_work(self) -> str:
        work_path = f"{self.app.tomcat_home}\\work"
        script = f'$p = "{work_path}"; Remove-Item "$p\\*" -Recurse -Force -ErrorAction SilentlyContinue'
        self.winrm.execute_powershell(script)
        return f"Cleaned work folder"

    def _clean_temp(self) -> str:
        temp_path = f"{self.app.tomcat_home}\\temp"
        script = f'$p = "{temp_path}"; Remove-Item "$p\\*" -Recurse -Force -ErrorAction SilentlyContinue'
        self.winrm.execute_powershell(script)
        return f"Cleaned temp folder"

    def _remove_context(self) -> str:
        context_path = f"{self.app.tomcat_home}\\webapps\\{self.app.context_name}"
        script = f'$p = "{context_path}"; Remove-Item $p -Recurse -Force -ErrorAction SilentlyContinue'
        self.winrm.execute_powershell(script)
        return f"Removed old context"

    def _remove_old_jar(self) -> str:
        jar_path = f"{self.app.tomcat_home}\\system\\{self.app.jar_name}"
        script = f'$p = "{jar_path}"; Remove-Item $p -Force -ErrorAction SilentlyContinue'
        self.winrm.execute_powershell(script)
        return f"Removed old JAR"

    def _upload_jar(self, jar_bytes: bytes) -> str:
        dest_path = f"{self.app.tomcat_home}\\system\\{self.app.jar_name}"
        system_dir = f"{self.app.tomcat_home}\\system"

        mkdir_script = (
            f'$p = "{system_dir}"; '
            f'if (!(Test-Path $p)) {{ New-Item -ItemType Directory -Path $p -Force }}'
        )
        self.winrm.execute_powershell(mkdir_script)

        jar_b64 = base64.b64encode(jar_bytes).decode()
        upload_script = (
            f'$dest = "{dest_path}";'
            f"$bytes = [Convert]::FromBase64String('{jar_b64}');"
            f'[IO.File]::WriteAllBytes($dest, $bytes)'
        )
        result = self.winrm.execute_powershell(upload_script)
        if not result.success:
            raise Exception("Failed to upload JAR file")
        return f"Uploaded JAR ({len(jar_bytes):,} bytes)"

    def _start_tomcat(self) -> str:
        svc = self.app.tomcat_service_name
        script = f'$svc = "{svc}"; Start-Service -LiteralName $svc -ErrorAction Stop'
        result = self.winrm.execute_powershell(script)
        if not result.success:
            raise Exception("Failed to start Tomcat service")
        return f"Started {svc}"

    def _validate_deployment(self) -> str:
        svc = self.app.tomcat_service_name
        script = (
            f'$svc = "{svc}"; '
            f'Start-Sleep -Seconds 5; '
            f'(Get-Service -LiteralName $svc).Status'
        )
        result = self.winrm.execute_powershell(script)
        if "Running" not in result.stdout:
            raise Exception("Tomcat failed to start after deployment")
        return "Deployment validated — Tomcat is running"

    def _rollback(self) -> None:
        try:
            svc = self.app.tomcat_service_name
            script = f'$svc = "{svc}"; Start-Service -LiteralName $svc -ErrorAction SilentlyContinue'
            self.winrm.execute_powershell(script)
        except Exception:
            pass
