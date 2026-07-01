"""FastAPI route declarations."""

from collections.abc import Callable
from typing import Annotated, TypeVar

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import crud
from auth import (
    authenticate_employee,
    create_access_token,
    get_current_employee,
    hash_password,
    require_roles,
)
from database import get_db
from models import Employee, EmployeeRole
from schemas import (
    BillCreate,
    BillResponse,
    BillUpdate,
    DashboardResponse,
    EmployeeCreate,
    EmployeeResponse,
    EmployeeUpdate,
    MessageResponse,
    PatientCreate,
    PatientResponse,
    PatientUpdate,
    Token,
)


router = APIRouter()
ResultType = TypeVar("ResultType")

AuthenticatedEmployee = Annotated[Employee, Depends(get_current_employee)]
StaffEmployee = Annotated[
    Employee,
    Depends(require_roles(EmployeeRole.ADMIN, EmployeeRole.RECEPTIONIST)),
]
AdminEmployee = Annotated[
    Employee,
    Depends(require_roles(EmployeeRole.ADMIN)),
]


def _write(operation: Callable[[], ResultType]) -> ResultType:
    try:
        return operation()
    except IntegrityError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The operation conflicts with existing database data",
        ) from error
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(error),
        ) from error


def _hash_password(password: str) -> str:
    try:
        return hash_password(password)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error


@router.post("/login", response_model=Token, tags=["authentication"])
def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)],
) -> Token:
    employee = authenticate_employee(db, form_data.username, form_data.password)
    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return Token(access_token=create_access_token(employee))


@router.get("/dashboard", response_model=DashboardResponse, tags=["dashboard"])
def dashboard(current_employee: AuthenticatedEmployee) -> DashboardResponse:
    return DashboardResponse(
        message="Hospital billing dashboard",
        employee=EmployeeResponse.model_validate(current_employee),
    )


# Patients


@router.post(
    "/patients",
    response_model=PatientResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["patients"],
)
def create_patient(
    payload: PatientCreate,
    db: Annotated[Session, Depends(get_db)],
    _current_employee: StaffEmployee,
) -> PatientResponse:
    return _write(lambda: crud.create_patient(db, payload.model_dump()))


@router.get("/patients", response_model=list[PatientResponse], tags=["patients"])
def list_patients(
    db: Annotated[Session, Depends(get_db)],
    _current_employee: StaffEmployee,
) -> list[PatientResponse]:
    return crud.get_all_patients(db)


@router.get(
    "/patients/{patient_id}", response_model=PatientResponse, tags=["patients"]
)
def get_patient(
    patient_id: int,
    db: Annotated[Session, Depends(get_db)],
    _current_employee: StaffEmployee,
) -> PatientResponse:
    patient = crud.get_patient_by_id(db, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.put(
    "/patients/{patient_id}", response_model=PatientResponse, tags=["patients"]
)
def update_patient(
    patient_id: int,
    payload: PatientUpdate,
    db: Annotated[Session, Depends(get_db)],
    _current_employee: StaffEmployee,
) -> PatientResponse:
    patient = _write(
        lambda: crud.update_patient(
            db, patient_id, payload.model_dump(exclude_unset=True)
        )
    )
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router.delete(
    "/patients/{patient_id}", response_model=MessageResponse, tags=["patients"]
)
def delete_patient(
    patient_id: int,
    db: Annotated[Session, Depends(get_db)],
    _current_employee: StaffEmployee,
) -> MessageResponse:
    deleted = _write(lambda: crud.delete_patient(db, patient_id))
    if not deleted:
        raise HTTPException(status_code=404, detail="Patient not found")
    return MessageResponse(message="Patient deleted")


# Bills


@router.post(
    "/bills",
    response_model=BillResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["bills"],
)
def create_bill(
    payload: BillCreate,
    db: Annotated[Session, Depends(get_db)],
    current_employee: StaffEmployee,
) -> BillResponse:
    bill_values = payload.model_dump(exclude={"items"})
    bill_values["employee_id"] = current_employee.id
    item_values = [item.model_dump() for item in payload.items]
    bill = _write(lambda: crud.create_bill(db, bill_values, item_values))
    complete_bill = crud.get_bill(db, bill.id)
    if complete_bill is None:
        raise HTTPException(status_code=404, detail="Bill not found")
    return complete_bill


@router.get("/bills", response_model=list[BillResponse], tags=["bills"])
def list_bills(
    db: Annotated[Session, Depends(get_db)],
    _current_employee: StaffEmployee,
) -> list[BillResponse]:
    return crud.get_all_bills(db)


@router.get("/bills/{bill_id}", response_model=BillResponse, tags=["bills"])
def get_bill(
    bill_id: int,
    db: Annotated[Session, Depends(get_db)],
    _current_employee: StaffEmployee,
) -> BillResponse:
    bill = crud.get_bill(db, bill_id)
    if bill is None:
        raise HTTPException(status_code=404, detail="Bill not found")
    return bill


@router.put("/bills/{bill_id}", response_model=BillResponse, tags=["bills"])
def update_bill(
    bill_id: int,
    payload: BillUpdate,
    db: Annotated[Session, Depends(get_db)],
    _current_employee: StaffEmployee,
) -> BillResponse:
    bill = _write(
        lambda: crud.update_bill(
            db, bill_id, payload.model_dump(exclude_unset=True)
        )
    )
    if bill is None:
        raise HTTPException(status_code=404, detail="Bill not found")
    refreshed_bill = crud.get_bill(db, bill_id)
    if refreshed_bill is None:
        raise HTTPException(status_code=404, detail="Bill not found")
    return refreshed_bill


@router.delete(
    "/bills/{bill_id}", response_model=MessageResponse, tags=["bills"]
)
def delete_bill(
    bill_id: int,
    db: Annotated[Session, Depends(get_db)],
    _current_employee: StaffEmployee,
) -> MessageResponse:
    deleted = _write(lambda: crud.delete_bill(db, bill_id))
    if not deleted:
        raise HTTPException(status_code=404, detail="Bill not found")
    return MessageResponse(message="Bill deleted")


# Employees (Admin only)


@router.post(
    "/employees",
    response_model=EmployeeResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["employees"],
)
def create_employee(
    payload: EmployeeCreate,
    db: Annotated[Session, Depends(get_db)],
    _current_employee: AdminEmployee,
) -> EmployeeResponse:
    values = payload.model_dump(exclude={"password"})
    values["password_hash"] = _hash_password(payload.password)
    return _write(lambda: crud.create_employee(db, values))


@router.get(
    "/employees", response_model=list[EmployeeResponse], tags=["employees"]
)
def list_employees(
    db: Annotated[Session, Depends(get_db)],
    _current_employee: AdminEmployee,
) -> list[EmployeeResponse]:
    return crud.get_all_employees(db)


@router.put(
    "/employees/{employee_id}",
    response_model=EmployeeResponse,
    tags=["employees"],
)
def update_employee(
    employee_id: int,
    payload: EmployeeUpdate,
    db: Annotated[Session, Depends(get_db)],
    _current_employee: AdminEmployee,
) -> EmployeeResponse:
    values = payload.model_dump(exclude_unset=True, exclude={"password"})
    if payload.password is not None:
        values["password_hash"] = _hash_password(payload.password)
    employee = _write(lambda: crud.update_employee(db, employee_id, values))
    if employee is None:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee


@router.delete(
    "/employees/{employee_id}",
    response_model=MessageResponse,
    tags=["employees"],
)
def delete_employee(
    employee_id: int,
    db: Annotated[Session, Depends(get_db)],
    _current_employee: AdminEmployee,
) -> MessageResponse:
    deleted = _write(lambda: crud.delete_employee(db, employee_id))
    if not deleted:
        raise HTTPException(status_code=404, detail="Employee not found")
    return MessageResponse(message="Employee deleted")
