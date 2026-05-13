import logging

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger(__name__)

TEAM_PREFIXES = ("/api/admin/teams", "/api/my-team")


class TeamAuthMiddleware(BaseHTTPMiddleware):
    """
    Logs unauthorized access attempts to team endpoints.
    Actual permission enforcement is done inside each router via dependencies.
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        if response.status_code == 403 and any(
            request.url.path.startswith(p) for p in TEAM_PREFIXES
        ):
            logger.warning(
                "Unauthorized team access: %s %s → 403",
                request.method,
                request.url.path,
            )
        return response
