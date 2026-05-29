from typing import Iterable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User, UserRole
from app.services.security import ACCESS_TOKEN_TYPE, decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=True)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    creds_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
    except ValueError:
        raise creds_exc

    if payload.get("type") != ACCESS_TOKEN_TYPE:
        raise creds_exc

    user_id = payload.get("sub")
    if user_id is None:
        raise creds_exc

    user = db.get(User, int(user_id))
    if user is None or not user.is_active:
        raise creds_exc
    return user


def require_roles(*roles: UserRole):
    allowed: Iterable[UserRole] = roles

    def _dep(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return _dep
