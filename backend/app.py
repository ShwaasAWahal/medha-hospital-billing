"""FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import crud
from auth import hash_password
from config import get_settings
from sqlalchemy.orm import Session
from database import Base, SessionLocal, engine
from models import EmployeeRole
from routes import router
import audit


settings = get_settings()


def initialize_settings(db: Session) -> None:
    from models import HospitalSetting
    import os

    defaults = {
        "name": os.getenv("VITE_HOSPITAL_NAME", "MEDHA HOSPITAL"),
        "address": os.getenv("VITE_HOSPITAL_ADDRESS", "Hospital Address"),
        "city": "City",
        "state": "State",
        "pin": "PIN",
        "phone": os.getenv("VITE_HOSPITAL_PHONE", "+91 XXXXX XXXXX"),
        "email": os.getenv("VITE_HOSPITAL_EMAIL", "billing@hospital.example"),
        "gstin": os.getenv("VITE_HOSPITAL_GSTIN", "GSTIN Placeholder"),
        "tax_rate": os.getenv("VITE_TAX_RATE_PERCENT", "18"),
    }

    for key, val in defaults.items():
        existing = db.get(HospitalSetting, key)
        if existing is None:
            db.add(HospitalSetting(key=key, value=val))
    db.commit()


def initialize_database() -> None:
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        initialize_settings(db)

    if not settings.initial_admin_username:
        return

    with SessionLocal() as db:
        existing_employee = crud.get_employee_by_username(
            db, settings.initial_admin_username
        )
        if existing_employee is None:
            crud.create_employee(
                db,
                {
                    "username": settings.initial_admin_username,
                    "password_hash": hash_password(settings.initial_admin_password),
                    "full_name": settings.initial_admin_full_name,
                    "role": EmployeeRole.ADMIN,
                },
            )


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
