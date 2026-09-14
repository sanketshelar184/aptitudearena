from datetime import UTC, datetime

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["system"])


class HealthResponse(BaseModel):
    status: str
    timestamp: datetime


@router.get("/health", response_model=HealthResponse, summary="API health check")
def health_check() -> HealthResponse:
    return HealthResponse(status="ok", timestamp=datetime.now(UTC))
