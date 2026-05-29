from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.middleware.deps import get_current_user, require_roles
from app.models.company import Company
from app.models.user import User, UserRole
from app.schemas.common import Page
from app.schemas.company import CompanyCreate, CompanyRead, CompanyUpdate
from app.utils.slug import unique_slug

router = APIRouter(prefix="/companies", tags=["companies"])


def _slug_exists(db: Session):
    def _check(candidate: str) -> bool:
        return db.scalar(select(Company.id).where(Company.slug == candidate)) is not None

    return _check


@router.get("", response_model=Page[CompanyRead])
def list_companies(
    db: Session = Depends(get_db),
    q: str | None = Query(None, description="Search by name or industry"),
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

    total = db.scalar(count_q) or 0
    offset = (page - 1) * page_size
    rows = db.scalars(base.order_by(Company.name).offset(offset).limit(page_size)).all()
    return Page[CompanyRead](
        items=[CompanyRead.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, (total + page_size - 1) // page_size),
    )


@router.get("/{company_id}", response_model=CompanyRead)
def get_company(company_id: int, db: Session = Depends(get_db)) -> CompanyRead:
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    return CompanyRead.model_validate(company)


@router.post("", response_model=CompanyRead, status_code=status.HTTP_201_CREATED)
def create_company(
    payload: CompanyCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.EMPLOYER, UserRole.ADMIN)),
) -> CompanyRead:
    if user.role == UserRole.EMPLOYER:
        existing = db.scalar(select(Company).where(Company.owner_id == user.id))
        if existing is not None:
            raise HTTPException(status_code=400, detail="Employer already owns a company")

    data = payload.model_dump(mode="json")
    company = Company(
        owner_id=user.id,
        slug=unique_slug(payload.name, _slug_exists(db)),
        **data,
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    return CompanyRead.model_validate(company)


@router.patch("/{company_id}", response_model=CompanyRead)
def update_company(
    company_id: int,
    payload: CompanyUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> CompanyRead:
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found")
    if user.role != UserRole.ADMIN and company.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Cannot edit a company you do not own")

    for k, v in payload.model_dump(exclude_unset=True, mode="json").items():
        setattr(company, k, v)
    db.commit()
    db.refresh(company)
    return CompanyRead.model_validate(company)


@router.get("/me/owned", response_model=CompanyRead)
def my_company(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(UserRole.EMPLOYER, UserRole.ADMIN)),
) -> CompanyRead:
    company = db.scalar(select(Company).where(Company.owner_id == user.id))
    if company is None:
        raise HTTPException(status_code=404, detail="No company owned by current user")
    return CompanyRead.model_validate(company)
