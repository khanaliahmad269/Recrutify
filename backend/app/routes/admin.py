from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.middleware.deps import require_roles
from app.models.application import Application, ApplicationStatus
from app.models.company import Company
from app.models.job import Job
from app.models.user import User, UserRole
from app.schemas.admin import (
    AdminStats,
    CompanyVerifyUpdate,
    JobAdminUpdate,
    UserAdminUpdate,
)
from app.schemas.common import Page
from app.schemas.company import CompanyRead
from app.schemas.job import JobReadDetailed
from app.schemas.user import UserRead

router = APIRouter(prefix="/admin", tags=["admin"])

# Every endpoint in this router requires admin role.
_admin_only = require_roles(UserRole.ADMIN)


@router.get("/stats", response_model=AdminStats)
def stats(db: Session = Depends(get_db), _: User = Depends(_admin_only)) -> AdminStats:
    role_counts = dict(
        db.execute(select(User.role, func.count(User.id)).group_by(User.role)).all()
    )
    app_counts = dict(
        db.execute(
            select(Application.status, func.count(Application.id)).group_by(Application.status)
        ).all()
    )

    return AdminStats(
        total_users=sum(role_counts.values()),
        seekers=role_counts.get(UserRole.JOB_SEEKER, 0),
        employers=role_counts.get(UserRole.EMPLOYER, 0),
        admins=role_counts.get(UserRole.ADMIN, 0),
        total_companies=db.scalar(select(func.count(Company.id))) or 0,
        verified_companies=db.scalar(
            select(func.count(Company.id)).where(Company.is_verified.is_(True))
        ) or 0,
        total_jobs=db.scalar(select(func.count(Job.id))) or 0,
        active_jobs=db.scalar(select(func.count(Job.id)).where(Job.is_active.is_(True))) or 0,
        total_applications=db.scalar(select(func.count(Application.id))) or 0,
        applications_by_status={s.value: app_counts.get(s, 0) for s in ApplicationStatus},
    )


# --- Users ---


@router.get("/users", response_model=Page[UserRead])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(_admin_only),
    q: str | None = Query(None, description="Search email or full_name"),
    role: UserRole | None = None,
    is_active: bool | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> Page[UserRead]:
    base = select(User)
    count_q = select(func.count(User.id))

    if q:
        like = f"%{q}%"
        cond = or_(User.email.ilike(like), User.full_name.ilike(like))
        base = base.where(cond)
        count_q = count_q.where(cond)
    if role is not None:
        base = base.where(User.role == role)
        count_q = count_q.where(User.role == role)
    if is_active is not None:
        base = base.where(User.is_active.is_(is_active))
        count_q = count_q.where(User.is_active.is_(is_active))

    total = db.scalar(count_q) or 0
    offset = (page - 1) * page_size
    rows = db.scalars(base.order_by(User.created_at.desc()).offset(offset).limit(page_size)).all()
    return Page[UserRead](
        items=[UserRead.model_validate(u) for u in rows],
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, (total + page_size - 1) // page_size),
    )


@router.patch("/users/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    payload: UserAdminUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(_admin_only),
) -> UserRead:
    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == admin.id and payload.is_active is False:
        raise HTTPException(status_code=400, detail="Admin cannot deactivate themselves")
    if target.id == admin.id and payload.role is not None and payload.role != UserRole.ADMIN:
        raise HTTPException(status_code=400, detail="Admin cannot demote themselves")

    if payload.role is not None:
        target.role = payload.role
    if payload.is_active is not None:
        target.is_active = payload.is_active
    if payload.is_verified is not None:
        target.is_verified = payload.is_verified

    db.commit()
    db.refresh(target)
    return UserRead.model_validate(target)


# --- Companies ---


@router.get("/companies", response_model=Page[CompanyRead])
def list_companies_admin(
    db: Session = Depends(get_db),
    _: User = Depends(_admin_only),
    q: str | None = None,
    is_verified: bool | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> Page[CompanyRead]:
    base = select(Company)
    count_q = select(func.count(Company.id))

    if q:
        like = f"%{q}%"
        cond = or_(Company.name.ilike(like), Company.industry.ilike(like))
        base = base.where(cond)
        count_q = count_q.where(cond)
    if is_verified is not None:
        base = base.where(Company.is_verified.is_(is_verified))
        count_q = count_q.where(Company.is_verified.is_(is_verified))

    total = db.scalar(count_q) or 0
    offset = (page - 1) * page_size
    rows = db.scalars(base.order_by(Company.name).offset(offset).limit(page_size)).all()
    return Page[CompanyRead](
        items=[CompanyRead.model_validate(c) for c in rows],
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, (total + page_size - 1) // page_size),
    )


@router.patch("/companies/{company_id}/verify", response_model=CompanyRead)
def verify_company(
    company_id: int,
    payload: CompanyVerifyUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_admin_only),
) -> CompanyRead:
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    company.is_verified = payload.is_verified
    db.commit()
    db.refresh(company)
    return CompanyRead.model_validate(company)


# --- Jobs (moderation) ---


@router.get("/jobs", response_model=Page[JobReadDetailed])
def list_jobs_admin(
    db: Session = Depends(get_db),
    _: User = Depends(_admin_only),
    q: str | None = None,
    is_active: bool | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> Page[JobReadDetailed]:
    base = select(Job).options(selectinload(Job.company))
    count_q = select(func.count(Job.id))

    if q:
        like = f"%{q}%"
        cond = or_(Job.title.ilike(like), Job.description.ilike(like))
        base = base.where(cond)
        count_q = count_q.where(cond)
    if is_active is not None:
        base = base.where(Job.is_active.is_(is_active))
        count_q = count_q.where(Job.is_active.is_(is_active))

    total = db.scalar(count_q) or 0
    offset = (page - 1) * page_size
    rows = db.scalars(base.order_by(Job.created_at.desc()).offset(offset).limit(page_size)).all()
    return Page[JobReadDetailed](
        items=[JobReadDetailed.model_validate(j) for j in rows],
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, (total + page_size - 1) // page_size),
    )


@router.patch("/jobs/{job_id}", response_model=JobReadDetailed)
def update_job_admin(
    job_id: int,
    payload: JobAdminUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(_admin_only),
) -> JobReadDetailed:
    job = db.scalar(select(Job).where(Job.id == job_id).options(selectinload(Job.company)))
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    if payload.is_active is not None:
        job.is_active = payload.is_active
    db.commit()
    db.refresh(job)
    return JobReadDetailed.model_validate(job)


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job_admin(
    job_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(_admin_only),
) -> None:
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(job)
    db.commit()
