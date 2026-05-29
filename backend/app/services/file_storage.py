"""Local-disk file storage for resume uploads.

Files land under `backend/uploads/resumes/{user_id}/{random}.{ext}` so:
- Files from different users never collide
- Filenames are unguessable from the outside (the API never exposes the on-disk path)

Switch to S3/Cloudinary in production — keep this module's signature stable and the route
layer won't need to change.
"""
from __future__ import annotations

import os
from pathlib import Path
from secrets import token_urlsafe

# Resolved to backend/uploads at import time.
_BACKEND_ROOT = Path(__file__).resolve().parents[2]
UPLOADS_ROOT = _BACKEND_ROOT / "uploads" / "resumes"


def _user_dir(user_id: int) -> Path:
    d = UPLOADS_ROOT / str(user_id)
    d.mkdir(parents=True, exist_ok=True)
    return d


def save_resume_file(user_id: int, content: bytes, original_filename: str) -> tuple[Path, str]:
    """Write `content` to disk, return (absolute_path, stored_filename).

    `stored_filename` is the random name on disk — `original_filename` should be tracked
    separately on the Resume model for download-as.
    """
    ext = Path(original_filename).suffix.lower()
    stored_name = f"{token_urlsafe(16)}{ext}"
    target = _user_dir(user_id) / stored_name
    target.write_bytes(content)
    return target, stored_name


def delete_resume_file(user_id: int, stored_filename: str | None) -> None:
    """Best-effort delete. Silently no-ops if the file isn't there."""
    if not stored_filename:
        return
    target = UPLOADS_ROOT / str(user_id) / stored_filename
    try:
        os.remove(target)
    except FileNotFoundError:
        pass


def resume_file_path(user_id: int, stored_filename: str) -> Path:
    return UPLOADS_ROOT / str(user_id) / stored_filename
