"""Password hashing, JWT handling, and authorization dependencies."""

from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Annotated, Any

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from sqlalchemy.orm import Session

from config import get_settings
from crud import get_employee_by_id, get_employee_by_username
from database import get_db
from models import Employee, EmployeeRole


settings = get_settings()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


def credentials_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


def forbidden_exception() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Insufficient permissions",
    )


def hash_password(password: str) -> str:
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > 72:
        raise ValueError("Password must not exceed 72 UTF-8 bytes for bcrypt")
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > 72:
        return False
    try:
        return bcrypt.checkpw(password_bytes, password_hash.encode("utf-8"))
    except ValueError:
        return False


# Running bcrypt even for an unknown username reduces timing-based user discovery.
DUMMY_PASSWORD_HASH = hash_password("not-a-real-user-password")


def authenticate_employee(db: Session, username: str, password: str) -> Employee | None:
    employee = get_employee_by_username(db, username)
    stored_hash = employee.password_hash if employee else DUMMY_PASSWORD_HASH

    if not verify_password(password, stored_hash) or employee is None:
        return None
    return employee


def create_access_token(employee: Employee) -> str:
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": str(employee.id),
        "role": employee.role.value,
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def get_current_employee(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> Employee:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
            options={"require": ["exp", "iat", "sub"]},
        )
        employee_id = int(payload["sub"])
    except (InvalidTokenError, KeyError, TypeError, ValueError):
        raise credentials_exception()

    employee = get_employee_by_id(db, employee_id)
    if employee is None:
        raise credentials_exception()
    return employee


def require_roles(
    *allowed_roles: EmployeeRole,
) -> Callable[[Employee], Employee]:
    def role_dependency(
        current_employee: Annotated[Employee, Depends(get_current_employee)],
    ) -> Employee:
        if current_employee.role not in allowed_roles:
            raise forbidden_exception()
        return current_employee

    return role_dependency
