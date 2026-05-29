"""Populate the database with demo users, companies, and jobs.

Run from the backend/ directory:
    python -m app.scripts.seed

Idempotent: safe to run multiple times; existing rows are skipped.
"""
from __future__ import annotations

from sqlalchemy import select

from app.database import Base, SessionLocal, engine
from app.models import (
    Application,
    ApplicationStatus,
    Company,
    EmploymentType,
    ExperienceLevel,
    Job,
    User,
    UserRole,
)
from app.services.security import hash_password
from app.utils.slug import slugify

USERS = [
    {
        "email": "admin@recrutify.dev",
        "full_name": "Site Admin",
        "password": "Admin1234!",
        "role": UserRole.ADMIN,
        "is_verified": True,
    },
    {
        "email": "employer@acme.dev",
        "full_name": "Erin Employer",
        "password": "Employer1234!",
        "role": UserRole.EMPLOYER,
        "is_verified": True,
    },
    {
        "email": "employer@northwind.dev",
        "full_name": "Nate Northwind",
        "password": "Employer1234!",
        "role": UserRole.EMPLOYER,
        "is_verified": True,
    },
    {
        "email": "alice@candidates.dev",
        "full_name": "Alice Applicant",
        "password": "Seeker1234!",
        "role": UserRole.JOB_SEEKER,
        "is_verified": True,
    },
    {
        "email": "bob@candidates.dev",
        "full_name": "Bob Builder",
        "password": "Seeker1234!",
        "role": UserRole.JOB_SEEKER,
        "is_verified": True,
    },
]

COMPANIES = [
    {
        "owner_email": "employer@acme.dev",
        "name": "Acme Corp",
        "description": "We build the world's finest anvils, rockets, and roadrunner-traps.",
        "website": "https://acme.example.com",
        "location": "Remote",
        "industry": "Manufacturing",
        "size_range": "201-500",
        "is_verified": True,
    },
    {
        "owner_email": "employer@northwind.dev",
        "name": "Northwind Traders",
        "description": "Specialty foods, distributed worldwide.",
        "website": "https://northwind.example.com",
        "location": "Berlin, DE",
        "industry": "Logistics",
        "size_range": "501-1000",
        "is_verified": True,
    },
]

JOBS = [
    {
        "company_name": "Acme Corp",
        "title": "Senior Frontend Engineer",
        "description": "Lead our React + TypeScript codebase. You'll own the design-system migration and mentor mid-level engineers.",
        "requirements": "5+ years React, deep TypeScript, design-system experience.",
        "location": "Remote",
        "is_remote": True,
        "employment_type": EmploymentType.FULL_TIME,
        "experience_level": ExperienceLevel.SENIOR,
        "category": "Engineering",
        "salary_min": 120000,
        "salary_max": 160000,
        "currency": "USD",
    },
    {
        "company_name": "Acme Corp",
        "title": "Backend Engineer (Python / FastAPI)",
        "description": "Own our async APIs. Postgres, FastAPI, and a dash of ML.",
        "requirements": "Python expert, async + SQL, comfort with cloud ops.",
        "location": "Remote",
        "is_remote": True,
        "employment_type": EmploymentType.FULL_TIME,
        "experience_level": ExperienceLevel.MID,
        "category": "Engineering",
        "salary_min": 95000,
        "salary_max": 130000,
        "currency": "USD",
    },
    {
        "company_name": "Acme Corp",
        "title": "Product Design Intern",
        "description": "Join our design crew for a paid 12-week internship. Figma, user research, design tokens.",
        "requirements": "Portfolio of UI work, eagerness to ship.",
        "location": "New York, NY",
        "is_remote": False,
        "employment_type": EmploymentType.INTERNSHIP,
        "experience_level": ExperienceLevel.ENTRY,
        "category": "Design",
        "salary_min": 30,
        "salary_max": 40,
        "currency": "USD",
    },
    {
        "company_name": "Northwind Traders",
        "title": "Data Scientist",
        "description": "Forecast demand across 40 SKUs and 12 regions. Heavy NLP work on customer reviews.",
        "requirements": "Python, scikit-learn, time-series forecasting, NLP fundamentals.",
        "location": "Berlin, DE",
        "is_remote": False,
        "employment_type": EmploymentType.FULL_TIME,
        "experience_level": ExperienceLevel.MID,
        "category": "Data",
        "salary_min": 80000,
        "salary_max": 110000,
        "currency": "EUR",
    },
    {
        "company_name": "Northwind Traders",
        "title": "Logistics Coordinator",
        "description": "Coordinate inbound shipments across European warehouses.",
        "requirements": "3+ years logistics, fluent English + German.",
        "location": "Berlin, DE",
        "is_remote": False,
        "employment_type": EmploymentType.CONTRACT,
        "experience_level": ExperienceLevel.MID,
        "category": "Operations",
        "salary_min": 55000,
        "salary_max": 70000,
        "currency": "EUR",
    },
]


def seed() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        users_by_email: dict[str, User] = {}
        for u in USERS:
            existing = db.scalar(select(User).where(User.email == u["email"]))
            if existing:
                users_by_email[u["email"]] = existing
                continue
            user = User(
                email=u["email"],
                full_name=u["full_name"],
                hashed_password=hash_password(u["password"]),
                role=u["role"],
                is_verified=u["is_verified"],
            )
            db.add(user)
            db.flush()
            users_by_email[u["email"]] = user

        companies_by_name: dict[str, Company] = {}
        for c in COMPANIES:
            existing = db.scalar(select(Company).where(Company.name == c["name"]))
            if existing:
                companies_by_name[c["name"]] = existing
                continue
            company = Company(
                name=c["name"],
                slug=slugify(c["name"]),
                description=c["description"],
                website=c["website"],
                location=c["location"],
                industry=c["industry"],
                size_range=c["size_range"],
                is_verified=c["is_verified"],
                owner_id=users_by_email[c["owner_email"]].id,
            )
            db.add(company)
            db.flush()
            companies_by_name[c["name"]] = company

        for j in JOBS:
            company = companies_by_name[j["company_name"]]
            existing = db.scalar(
                select(Job).where(Job.title == j["title"], Job.company_id == company.id)
            )
            if existing:
                continue
            job = Job(
                title=j["title"],
                description=j["description"],
                requirements=j["requirements"],
                location=j["location"],
                is_remote=j["is_remote"],
                employment_type=j["employment_type"],
                experience_level=j["experience_level"],
                category=j["category"],
                salary_min=j["salary_min"],
                salary_max=j["salary_max"],
                currency=j["currency"],
                company_id=company.id,
                posted_by_id=company.owner_id,
            )
            db.add(job)
        db.flush()  # ensure jobs have IDs before we link an application below

        # A sample application so the dashboard has something to render
        alice = users_by_email["alice@candidates.dev"]
        first_job = db.scalar(select(Job).order_by(Job.id.asc()))
        if first_job is not None:
            already = db.scalar(
                select(Application).where(
                    Application.applicant_id == alice.id,
                    Application.job_id == first_job.id,
                )
            )
            if not already:
                db.add(
                    Application(
                        job_id=first_job.id,
                        applicant_id=alice.id,
                        cover_letter="Excited to bring my React expertise to Acme.",
                        status=ApplicationStatus.REVIEWED,
                    )
                )

        db.commit()
        print("Seed complete.")
        print(f"  Users:     {db.scalar(select(__import__('sqlalchemy').func.count(User.id)))}")
        print(f"  Companies: {db.scalar(select(__import__('sqlalchemy').func.count(Company.id)))}")
        print(f"  Jobs:      {db.scalar(select(__import__('sqlalchemy').func.count(Job.id)))}")
        print("\nLogin credentials:")
        for u in USERS:
            print(f"  [{u['role'].value:10}] {u['email']:30}  password: {u['password']}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
