from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.job import EmploymentType, ExperienceLevel
from app.schemas.company import CompanyRead


class JobBase(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(min_length=1)
    requirements: str | None = None
    location: str | None = Field(default=None, max_length=255)
    is_remote: bool = False
    employment_type: EmploymentType = EmploymentType.FULL_TIME
    experience_level: ExperienceLevel = ExperienceLevel.MID
    category: str | None = Field(default=None, max_length=120)
    salary_min: int | None = Field(default=None, ge=0)
    salary_max: int | None = Field(default=None, ge=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    expires_at: datetime | None = None

    @model_validator(mode="after")
    def _validate_salary_range(self) -> "JobBase":
        if self.salary_min is not None and self.salary_max is not None:
            if self.salary_max < self.salary_min:
                raise ValueError("salary_max must be >= salary_min")
        return self


class JobCreate(JobBase):
    pass


class JobUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    requirements: str | None = None
    location: str | None = Field(default=None, max_length=255)
    is_remote: bool | None = None
    employment_type: EmploymentType | None = None
    experience_level: ExperienceLevel | None = None
    category: str | None = Field(default=None, max_length=120)
    salary_min: int | None = Field(default=None, ge=0)
    salary_max: int | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    expires_at: datetime | None = None
    is_active: bool | None = None


class JobRead(JobBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    company_id: int
    posted_by_id: int
    created_at: datetime
    updated_at: datetime


class JobReadDetailed(JobRead):
    company: CompanyRead | None = None


class JobReadWithStats(JobRead):
    """Job row for the employer dashboard — includes application counts."""

    application_count: int = 0
    pending_count: int = 0
