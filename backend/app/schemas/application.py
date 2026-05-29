from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.application import ApplicationStatus
from app.schemas.job import JobRead
from app.schemas.user import UserRead


class ApplicationCreate(BaseModel):
    cover_letter: str | None = Field(default=None, max_length=5000)


class ApplicationStatusUpdate(BaseModel):
    status: ApplicationStatus


class ApplicationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_id: int
    applicant_id: int
    cover_letter: str | None
    status: ApplicationStatus
    created_at: datetime
    updated_at: datetime


class ApplicationReadWithJob(ApplicationRead):
    job: JobRead | None = None


class ApplicationReadWithApplicant(ApplicationRead):
    applicant: UserRead | None = None
