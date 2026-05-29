from pydantic import BaseModel, ConfigDict, Field

from app.models.user import UserRole


class AdminStats(BaseModel):
    total_users: int
    seekers: int
    employers: int
    admins: int
    total_companies: int
    verified_companies: int
    total_jobs: int
    active_jobs: int
    total_applications: int
    applications_by_status: dict[str, int]


class UserAdminUpdate(BaseModel):
    role: UserRole | None = None
    is_active: bool | None = None
    is_verified: bool | None = None


class CompanyVerifyUpdate(BaseModel):
    is_verified: bool


class JobAdminUpdate(BaseModel):
    is_active: bool | None = None
