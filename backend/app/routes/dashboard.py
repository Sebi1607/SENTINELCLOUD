from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.schemas.dashboard import DashboardStatsResponse
from app.services.monitor_service import compute_dashboard_stats

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStatsResponse)
def get_dashboard_stats(
    db: Session = Depends(get_db),
) -> DashboardStatsResponse:
    """
    Return aggregated KPI stats (totalMonitors, operational, down, overallUptime, avgLatency)
    and global telemetry series for the dashboard.
    """
    return compute_dashboard_stats(db)
