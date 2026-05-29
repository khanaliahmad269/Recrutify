from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.middleware.deps import require_roles
from app.models.application import Application
from app.models.job import Job
from app.models.resume import Resume
from app.models.user import User, UserRole
from app.schemas.application import ApplicationRead
from app.schemas.job import JobReadDetailed
from app.schemas.match import ApplicantMatch, JobMatch
from app.schemas.user import UserRead
from app.services.matching import (
    job_corpus_text,
    resume_corpus_text,
    score_resume_against_jobs,
    score_resumes_against_job,
)

# Seeker-facing endpoint lives under /me; employer-facing one lives under /jobs.
me_router = APIRouter(prefix="/me", tags=["matching"])
jobs_router = APIRouter(prefix="/jobs", tags=["matching"])


@me_router.get("/job-matches", response_model=list[JobMatch])
def my_job_matches(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.JOB_SEEKER)),
    limit: int = Query(10, ge=1, le=50),
) -> list[JobMatch]:
    resume = db.scalar(select(Resume).where(Resume.user_id == user.id))
    if resume is None:
        raise HTTPException(
            status_code=400,
            detail="Add your resume to see personalized job matches",
        )

    jobs = db.scalars(
        select(Job)
        .where(Job.is_active.is_(True))
        .options(selectinload(Job.company))
    ).all()

    scored = score_resume_against_jobs(resume_corpus_text(resume), jobs, top_k=limit)
    return [
        JobMatch(job=JobReadDetailed.model_validate(j), score=round(s, 4))
        for j, s in scored
    ]


@jobs_router.get("/{job_id}/applicant-scores", response_model=list[ApplicantMatch])
def applicants_ranked_by_match(
    job_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.EMPLOYER, UserRole.ADMIN)),
    limit: int = Query(50, ge=1, le=100),
) -> list[ApplicantMatch]:
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    if user.role != UserRole.ADMIN and job.posted_by_id != user.id:
        raise HTTPException(status_code=403, detail="Cannot view matches for a job you did not post")

    applications = db.scalars(
        select(Application)
        .where(Application.job_id == job_id)
        .options(selectinload(Application.applicant))
    ).all()

    # Pull resumes for all applicants in one query.
    applicant_ids = [a.applicant_id for a in applications]
    resumes_by_user_id: dict[int, Resume] = {}
    if applicant_ids:
        rows = db.scalars(select(Resume).where(Resume.user_id.in_(applicant_ids))).all()
        resumes_by_user_id = {r.user_id: r for r in rows}

    job_text = job_corpus_text(job)
    resume_list = list(resumes_by_user_id.values())
    score_map: dict[int, float] = {}
    if resume_list:
        scored = score_resumes_against_job(job_text, resume_list)
        score_map = {r.user_id: float(s) for r, s in scored}

    results: list[ApplicantMatch] = []
    for a in applications:
        has_resume = a.applicant_id in resumes_by_user_id
        results.append(
            ApplicantMatch(
                application_id=a.id,
                applicant=UserRead.model_validate(a.applicant),
                status=a.status.value,
                has_resume=has_resume,
                score=round(score_map.get(a.applicant_id, 0.0), 4),
            )
        )

    # Sort: with resume + highest score first, then no-resume applicants.
    results.sort(key=lambda m: (m.has_resume, m.score), reverse=True)
    return results[:limit]
