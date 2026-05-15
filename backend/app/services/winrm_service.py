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


# Module-level session cache keyed by (hostname, port, username).
# Reusing the same winrm.Session avoids re-paying the NTLM 3-way handshake
# on every request. Sessions are stateless on the server side so this is safe
# to share across threads.
_session_cache: dict[tuple, winrm.Session] = {}


class WinRMService:
    # Timeout applied to every regular command.  Keeps the API responsive even
    # when the target server is slow — request will fail fast instead of
    # hanging until the process worker is exhausted.
    OPERATION_TIMEOUT = 30  # seconds
    READ_TIMEOUT = 31        # must be > OPERATION_TIMEOUT per pywinrm docs

    # Shorter limits used only for the connectivity test.
    TEST_OPERATION_TIMEOUT = 10
    TEST_READ_TIMEOUT = 11

    def __init__(self, hostname: str, username: str, password: str, port: int = 5985):
        self.hostname = hostname
        self.username = username
        self.password = password
        self.port = port

    def _get_session(self) -> winrm.Session:
        key = (self.hostname, self.port, self.username)
        if key not in _session_cache:
            _session_cache[key] = winrm.Session(
                f"http://{self.hostname}:{self.port}/wsman",
                auth=(self.username, self.password),
                transport="ntlm",
                operation_timeout_sec=self.OPERATION_TIMEOUT,
                read_timeout_sec=self.READ_TIMEOUT,
            )
        return _session_cache[key]

    def invalidate_session(self) -> None:
        """Drop the cached session (call after a credential change)."""
        key = (self.hostname, self.port, self.username)
        _session_cache.pop(key, None)

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
                operation_timeout_sec=self.TEST_OPERATION_TIMEOUT,
                read_timeout_sec=self.TEST_READ_TIMEOUT,
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
            # Session may be stale after a timeout — evict so next call reconnects
            self.invalidate_session()
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
            self.invalidate_session()
            return CommandResult(stdout="", stderr=str(exc), status_code=1)
