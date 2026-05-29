from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ResumeUpsert(BaseModel):
    """Create or replace the current user's resume."""

    headline: str | None = Field(default=None, max_length=255)
    summary: str | None = Field(default=None, max_length=5000)
    content_text: str = Field(min_length=10, max_length=50000)


class ResumeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    headline: str | None
    summary: str | None
    content_text: str
    original_filename: str | None
    mime_type: str | None
    file_url: str | None
    file_size: int | None
    created_at: datetime
    updated_at: datetime
