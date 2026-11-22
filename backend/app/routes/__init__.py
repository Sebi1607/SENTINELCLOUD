from app.routes.dashboard import router as dashboard_router
from app.routes.incidents import router as incidents_router
from app.routes.monitors import router as monitors_router
from app.routes.settings import router as settings_router

__all__ = [
    "dashboard_router",
    "incidents_router",
    "monitors_router",
    "settings_router",
]
