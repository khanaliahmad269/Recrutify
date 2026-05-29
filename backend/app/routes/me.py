from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.middleware.deps import require_roles
from app.models.application import Application, ApplicationStatus
from app.models.company import Company
from app.models.job import Job
from app.models.resume import Resume
from app.models.saved_job import SavedJob
from app.models.user import User, UserRole
from app.schemas.application import ApplicationReadWithJob
from app.schemas.common import Page
from app.schemas.job import JobReadWithStats
from app.schemas.resume import ResumeRead, ResumeUpsert
from app.schemas.saved_job import SavedJobRead
from app.services.file_storage import (
    delete_resume_file,
    resume_file_path,
    save_resume_file,
)
from app.services.resume_parsing import (
    ALLOWED_EXTS,
    MAX_FILE_BYTES,
    ResumeParseError,
    extract_text,
)

router = APIRouter(prefix="/me", tags=["me"])


@router.get("/applications", response_model=Page[ApplicationReadWithJob])
def my_applications(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.JOB_SEEKER)),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> Page[ApplicationReadWithJob]:
    total = db.scalar(
        select(func.count(Application.id)).where(Application.applicant_id == user.id)
    ) or 0
    offset = (page - 1) * page_size
    rows = (
        db.scalars(
            select(Application)
            .where(Application.applicant_id == user.id)
            .options(selectinload(Application.job))
            .order_by(Application.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        .unique()
        .all()
    )
    return Page[ApplicationReadWithJob](
        items=[ApplicationReadWithJob.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, (total + page_size - 1) // page_size),
    )


@router.post("/saved-jobs/{job_id}", status_code=status.HTTP_201_CREATED, response_model=SavedJobRead)
def save_job(
    job_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.JOB_SEEKER)),
) -> SavedJobRead:
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")

    existing = db.scalar(
        select(SavedJob).where(SavedJob.job_id == job_id, SavedJob.user_id == user.id)
    )
    if existing is not None:
        return SavedJobRead.model_validate(existing)

    saved = SavedJob(job_id=job_id, user_id=user.id)
    db.add(saved)
    db.commit()
    db.refresh(saved)
    return SavedJobRead.model_validate(saved)


@router.delete("/saved-jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def unsave_job(
    job_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.JOB_SEEKER)),
) -> None:
    saved = db.scalar(
        select(SavedJob).where(SavedJob.job_id == job_id, SavedJob.user_id == user.id)
    )
    if saved is None:
        raise HTTPException(status_code=404, detail="Job not saved")
    db.delete(saved)
    db.commit()


@router.get("/saved-jobs", response_model=Page[SavedJobRead])
def list_saved_jobs(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.JOB_SEEKER)),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> Page[SavedJobRead]:
    total = db.scalar(
        select(func.count(SavedJob.id)).where(SavedJob.user_id == user.id)
    ) or 0
    offset = (page - 1) * page_size
    rows = (
        db.scalars(
            select(SavedJob)
            .where(SavedJob.user_id == user.id)
            .options(selectinload(SavedJob.job))
            .order_by(SavedJob.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        .unique()
        .all()
    )
    return Page[SavedJobRead](
        items=[SavedJobRead.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, (total + page_size - 1) // page_size),
    )


# --- Resume (text-based until session 7 adds file upload) ---


@router.get("/resume", response_model=ResumeRead)
def get_resume(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.JOB_SEEKER)),
) -> ResumeRead:
    resume = db.scalar(select(Resume).where(Resume.user_id == user.id))
    if resume is None:
        raise HTTPException(status_code=404, detail="No resume on file")
    return ResumeRead.model_validate(resume)


@router.put("/resume", response_model=ResumeRead)
def upsert_resume(
    payload: ResumeUpsert,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.JOB_SEEKER)),
) -> ResumeRead:
    resume = db.scalar(select(Resume).where(Resume.user_id == user.id))
    if resume is None:
        resume = Resume(user_id=user.id, **payload.model_dump())
        db.add(resume)
    else:
        for k, v in payload.model_dump().items():
            setattr(resume, k, v)
    db.commit()
    db.refresh(resume)
    return ResumeRead.model_validate(resume)


@router.delete("/resume", status_code=status.HTTP_204_NO_CONTENT)
def delete_resume(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.JOB_SEEKER)),
) -> None:
    resume = db.scalar(select(Resume).where(Resume.user_id == user.id))
    if resume is None:
        raise HTTPException(status_code=404, detail="No resume on file")
    delete_resume_file(user.id, resume.file_url)
    db.delete(resume)
    db.commit()


@router.post("/resume/upload", response_model=ResumeRead)
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.JOB_SEEKER)),
) -> ResumeRead:
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename on uploaded file")
    ext = "." + file.filename.lower().rsplit(".", 1)[-1] if "." in file.filename else ""
    if ext not in ALLOWED_EXTS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext or 'unknown'}'. Upload a PDF, DOCX, or TXT file.",
        )

    content = await file.read()
    if len(content) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({len(content) // 1024} KB). Max is {MAX_FILE_BYTES // 1024 // 1024} MB.",
        )
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        text = extract_text(content, file.filename, file.content_type)
    except ResumeParseError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if len(text) < 10:
        raise HTTPException(
            status_code=400,
            detail="Extracted resume text is too short. Is this an image-only PDF? Try a text-based file.",
        )

    # Replace any existing resume + file.
    existing = db.scalar(select(Resume).where(Resume.user_id == user.id))
    if existing and existing.file_url:
        delete_resume_file(user.id, existing.file_url)

    _, stored_name = save_resume_file(user.id, content, file.filename)

    if existing is None:
        resume = Resume(
            user_id=user.id,
            content_text=text,
            original_filename=file.filename,
            mime_type=file.content_type,
            file_url=stored_name,  # opaque on-disk handle; never returned as a URL.
            file_size=len(content),
        )
        db.add(resume)
    else:
        existing.content_text = text
        existing.original_filename = file.filename
        existing.mime_type = file.content_type
        existing.file_url = stored_name
        existing.file_size = len(content)
        resume = existing

    db.commit()
    db.refresh(resume)
    return ResumeRead.model_validate(resume)


@router.get("/resume/file")
def download_resume_file(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.JOB_SEEKER)),
) -> FileResponse:
    resume = db.scalar(select(Resume).where(Resume.user_id == user.id))
    if resume is None or not resume.file_url:
        raise HTTPException(status_code=404, detail="No file attached to resume")
    path = resume_file_path(user.id, resume.file_url)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File missing on disk")
    return FileResponse(
        path,
        media_type=resume.mime_type or "application/octet-stream",
        filename=resume.original_filename or "resume",
    )


# --- Employer-only: jobs owned by current employer (including inactive) ---


@router.get("/employer/jobs", response_model=Page[JobReadWithStats])
def my_posted_jobs(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.EMPLOYER, UserRole.ADMIN)),
    include_inactive: bool = True,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> Page[JobReadWithStats]:
    base = select(Job).where(Job.posted_by_id == user.id)
    count_q = select(func.count(Job.id)).where(Job.posted_by_id == user.id)
    if not include_inactive:
        base = base.where(Job.is_active.is_(True))
        count_q = count_q.where(Job.is_active.is_(True))

    total = db.scalar(count_q) or 0
    offset = (page - 1) * page_size
    jobs = db.scalars(base.order_by(Job.created_at.desc()).offset(offset).limit(page_size)).all()

    if not jobs:
        return Page[JobReadWithStats](items=[], total=0, page=page, page_size=page_size, pages=1)

    job_ids = [j.id for j in jobs]
    # One query for total counts, one for pending counts.
    total_rows = db.execute(
        select(Application.job_id, func.count(Application.id))
        .where(Application.job_id.in_(job_ids))
        .group_by(Application.job_id)
    ).all()
    pending_rows = db.execute(
        select(Application.job_id, func.count(Application.id))
        .where(Application.job_id.in_(job_ids), Application.status == ApplicationStatus.PENDING)
        .group_by(Application.job_id)
    ).all()
    total_by_job = {jid: c for jid, c in total_rows}
    pending_by_job = {jid: c for jid, c in pending_rows}

    items = []
    for j in jobs:
        data = JobReadWithStats.model_validate(j).model_dump()
        data["application_count"] = total_by_job.get(j.id, 0)
        data["pending_count"] = pending_by_job.get(j.id, 0)
        items.append(JobReadWithStats(**data))

    return Page[JobReadWithStats](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, (total + page_size - 1) // page_size),
    )
