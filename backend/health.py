from fastapi import APIRouter

from server_stats import server_stats

router = APIRouter()


@router.get("/health")
async def health_check():
    return server_stats.health_payload()
