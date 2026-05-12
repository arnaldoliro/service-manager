import time
import winrm
from typing import Optional
from dataclasses import dataclass


@dataclass
class CommandResult:
    stdout: str
    stderr: str
    status_code: int

    @property
    def success(self) -> bool:
        return self.status_code == 0


@dataclass
class ConnectionTestResult:
    success: bool
    latency_ms: int
    remote_hostname: str = ""
    error: str = ""


class WinRMService:
    CONNECTION_TIMEOUT = 10  # seconds for test connections

    def __init__(self, hostname: str, username: str, password: str, port: int = 5985):
        self.hostname = hostname
        self.username = username
        self.password = password
        self.port = port
        self._session: Optional[winrm.Session] = None

    def _get_session(self) -> winrm.Session:
        if self._session is None:
            self._session = winrm.Session(
                f"http://{self.hostname}:{self.port}/wsman",
                auth=(self.username, self.password),
                transport="ntlm",
            )
        return self._session

    def test_connection(self) -> ConnectionTestResult:
        """
        Opens a dedicated short-timeout session and runs a safe read-only
        command ($env:COMPUTERNAME) to verify credentials and reachability.
        Never reuses the cached session — each test is independent.
        """
        start = time.monotonic()
        try:
            session = winrm.Session(
                f"http://{self.hostname}:{self.port}/wsman",
                auth=(self.username, self.password),
                transport="ntlm",
                operation_timeout_sec=self.CONNECTION_TIMEOUT,
                read_timeout_sec=self.CONNECTION_TIMEOUT + 1,
            )
            result = session.run_ps("$env:COMPUTERNAME")
            latency_ms = int((time.monotonic() - start) * 1000)

            if result.status_code == 0:
                remote_hostname = result.std_out.decode("utf-8", errors="replace").strip()
                return ConnectionTestResult(
                    success=True,
                    latency_ms=latency_ms,
                    remote_hostname=remote_hostname,
                )
            return ConnectionTestResult(
                success=False,
                latency_ms=latency_ms,
                error="Command execution failed on remote host",
            )
        except Exception:
            latency_ms = int((time.monotonic() - start) * 1000)
            return ConnectionTestResult(
                success=False,
                latency_ms=latency_ms,
                error="Connection failed",
            )

    def execute_powershell(self, script: str) -> CommandResult:
        session = self._get_session()
        try:
            result = session.run_ps(script)
            return CommandResult(
                stdout=result.std_out.decode("utf-8", errors="replace"),
                stderr=result.std_err.decode("utf-8", errors="replace"),
                status_code=result.status_code,
            )
        except Exception as exc:
            return CommandResult(stdout="", stderr=str(exc), status_code=1)

    def execute_cmd(self, command: str, args: list[str] | None = None) -> CommandResult:
        session = self._get_session()
        try:
            result = session.run_cmd(command, args or [])
            return CommandResult(
                stdout=result.std_out.decode("utf-8", errors="replace"),
                stderr=result.std_err.decode("utf-8", errors="replace"),
                status_code=result.status_code,
            )
        except Exception as exc:
            return CommandResult(stdout="", stderr=str(exc), status_code=1)
