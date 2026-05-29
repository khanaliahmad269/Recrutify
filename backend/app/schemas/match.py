from pydantic import BaseModel, Field

from app.schemas.job import JobReadDetailed
from app.schemas.user import UserRead


class JobMatch(BaseModel):
    """A job ranked for a candidate."""

    job: JobReadDetailed
    score: float = Field(ge=0.0, le=1.0)


class ApplicantMatch(BaseModel):
    """An applicant ranked for a job."""

    application_id: int
    applicant: UserRead
    status: str
    has_resume: bool
    score: float = Field(ge=0.0, le=1.0)
