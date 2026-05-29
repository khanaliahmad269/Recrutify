from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.middleware.deps import get_current_user, require_roles
from app.models.application import Application, ApplicationStatus
from app.models.company import Company
from app.models.job import EmploymentType, ExperienceLevel, Job
from app.models.user import User, UserRole
from app.schemas.application import (
    ApplicationCreate,
    ApplicationRead,
    ApplicationReadWithApplicant,
    ApplicationStatusUpdate,
)
from app.schemas.common import Page
from app.schemas.job import JobCreate, JobRead, JobReadDetailed, JobUpdate

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=Page[JobReadDetailed])
def list_jobs(
    db: Session = Depends(get_db),
    q: str | None = Query(None, description="Search title, description, company name"),
    location: str | None = None,
    is_remote: bool | None = None,
    employment_type: EmploymentType | None = None,
    experience_level: ExperienceLevel | None = None,
    category: str | None = None,
    company_id: int | None = None,
    salary_min: int | None = Query(None, ge=0),
    sort: str = Query("recent", pattern="^(recent|salary_desc|salary_asc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> Page[JobReadDetailed]:
    base = select(Job).where(Job.is_active.is_(True))
    count_q = select(func.count(Job.id)).where(Job.is_active.is_(True))

    if q:
        like = f"%{q}%"
        # Join companies for company-name search.
        cond = or_(
            Job.title.ilike(like),
            Job.description.ilike(like),
            Job.category.ilike(like),
            Job.company.has(Company.name.ilike(like)),
        )
        base = base.where(cond)
        count_q = count_q.where(cond)

    for col, val in (
        (Job.location, location),
        (Job.is_remote, is_remote),
        (Job.employment_type, employment_type),
        (Job.experience_level, experience_level),
        (Job.category, category),
        (Job.company_id, company_id),
    ):
        if val is not None:
            if col is Job.location:
                base = base.where(Job.location.ilike(f"%{val}%"))
                count_q = count_q.where(Job.location.ilike(f"%{val}%"))
            else:
                base = base.where(col == val)
                count_q = count_q.where(col == val)

    if salary_min is not None:
        base = base.where(Job.salary_max.is_(None) | (Job.salary_max >= salary_min))
        count_q = count_q.where(Job.salary_max.is_(None) | (Job.salary_max >= salary_min))

    if sort == "salary_desc":
        base = base.order_by(Job.salary_max.desc().nullslast(), Job.created_at.desc())
    elif sort == "salary_asc":
        base = base.order_by(Job.salary_min.asc().nullslast(), Job.created_at.desc())
    else:
        base = base.order_by(Job.created_at.desc())

    total = db.scalar(count_q) or 0
    offset = (page - 1) * page_size
    rows = (
        db.scalars(base.options(selectinload(Job.company)).offset(offset).limit(page_size))
        .unique()
        .all()
    )
    return Page[JobReadDetailed](
        items=[JobReadDetailed.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, (total + page_size - 1) // page_size),
    )


@router.get("/{job_id}", response_model=JobReadDetailed)
def get_job(job_id: int, db: Session = Depends(get_db)) -> JobReadDetailed:
    job = db.scalar(
        select(Job).where(Job.id == job_id).options(selectinload(Job.company))
    )
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return JobReadDetailed.model_validate(job)


@router.post("", response_model=JobRead, status_code=status.HTTP_201_CREATED)
def create_job(
    payload: JobCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.EMPLOYER, UserRole.ADMIN)),
) -> JobRead:
    company = db.scalar(select(Company).where(Company.owner_id == user.id))
    if company is None:
        raise HTTPException(
            status_code=400, detail="Create your company profile before posting a job"
        )

    job = Job(
        company_id=company.id,
        posted_by_id=user.id,
        **payload.model_dump(mode="json"),
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    return JobRead.model_validate(job)


def _owned_job_or_403(db: Session, job_id: int, user: User) -> Job:
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    if user.role != UserRole.ADMIN and job.posted_by_id != user.id:
        raise HTTPException(status_code=403, detail="Cannot modify a job you did not post")
    return job


@router.patch("/{job_id}", response_model=JobRead)
def update_job(
    job_id: int,
    payload: JobUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.EMPLOYER, UserRole.ADMIN)),
) -> JobRead:
    job = _owned_job_or_403(db, job_id, user)
    for k, v in payload.model_dump(exclude_unset=True, mode="json").items():
        setattr(job, k, v)
    db.commit()
    db.refresh(job)
    return JobRead.model_validate(job)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.EMPLOYER, UserRole.ADMIN)),
) -> None:
    job = _owned_job_or_403(db, job_id, user)
    db.delete(job)
    db.commit()


# --- Applications nested under jobs ---


@router.post(
    "/{job_id}/apply",
    response_model=ApplicationRead,
    status_code=status.HTTP_201_CREATED,
)
def apply_to_job(
    job_id: int,
    payload: ApplicationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.JOB_SEEKER)),
) -> ApplicationRead:
    job = db.get(Job, job_id)
    if job is None or not job.is_active:
        raise HTTPException(status_code=404, detail="Job not found or no longer active")

    existing = db.scalar(
        select(Application).where(
            Application.job_id == job_id, Application.applicant_id == user.id
        )
    )
    if existing is not None:
        raise HTTPException(status_code=400, detail="Already applied to this job")

    application = Application(
        job_id=job_id,
        applicant_id=user.id,
        cover_letter=payload.cover_letter,
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return ApplicationRead.model_validate(application)


@router.get("/{job_id}/applications", response_model=Page[ApplicationReadWithApplicant])
def list_applications_for_job(
    job_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.EMPLOYER, UserRole.ADMIN)),
    status_filter: ApplicationStatus | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> Page[ApplicationReadWithApplicant]:
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    if user.role != UserRole.ADMIN and job.posted_by_id != user.id:
        raise HTTPException(status_code=403, detail="Cannot view applications for a job you did not post")

    base = select(Application).where(Application.job_id == job_id)
    count_q = select(func.count(Application.id)).where(Application.job_id == job_id)
    if status_filter is not None:
        base = base.where(Application.status == status_filter)
        count_q = count_q.where(Application.status == status_filter)

    total = db.scalar(count_q) or 0
    offset = (page - 1) * page_size
    rows = (
        db.scalars(
            base.options(selectinload(Application.applicant))
            .order_by(Application.created_at.desc())
            .offset(offset)
            .limit(page_size)
        )
        .unique()
        .all()
    )
    return Page[ApplicationReadWithApplicant](
        items=[ApplicationReadWithApplicant.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, (total + page_size - 1) // page_size),
    )


@router.patch(
    "/{job_id}/applications/{application_id}",
    response_model=ApplicationRead,
)
def update_application_status(
    job_id: int,
    application_id: int,
    payload: ApplicationStatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.EMPLOYER, UserRole.ADMIN)),
) -> ApplicationRead:
    application = db.get(Application, application_id)
    if application is None or application.job_id != job_id:
        raise HTTPException(status_code=404, detail="Application not found")

    job = db.get(Job, job_id)
    if user.role != UserRole.ADMIN and (job is None or job.posted_by_id != user.id):
        raise HTTPException(status_code=403, detail="Cannot modify this application")

    application.status = payload.status
    db.commit()
    db.refresh(application)
    return ApplicationRead.model_validate(application)
