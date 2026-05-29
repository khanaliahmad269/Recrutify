from fastapi import APIRouter

from app.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
def health() -> dict[str, str]:
    s = get_settings()
    return {"status": "ok", "app": s.app_name, "env": s.app_env}
