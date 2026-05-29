from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.job import JobRead


class SavedJobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_id: int
    created_at: datetime
    job: JobRead | None = None
