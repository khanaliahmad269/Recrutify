from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class CompanyBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    logo_url: HttpUrl | None = None
    website: HttpUrl | None = None
    location: str | None = Field(default=None, max_length=255)
    industry: str | None = Field(default=None, max_length=120)
    size_range: str | None = Field(default=None, max_length=50)


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    logo_url: HttpUrl | None = None
    website: HttpUrl | None = None
    location: str | None = Field(default=None, max_length=255)
    industry: str | None = Field(default=None, max_length=120)
    size_range: str | None = Field(default=None, max_length=50)


class CompanyRead(CompanyBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    is_verified: bool
    owner_id: int
    created_at: datetime
