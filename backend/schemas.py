"""Pydantic request and response schemas belong in this module."""

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from models import EmployeeRole


class BaseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"


class EmployeeResponse(BaseSchema):
    id: int
    username: str
    full_name: str
    role: EmployeeRole
    created_at: datetime


class EmployeeCreate(BaseModel):
    username: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=8, max_length=72)
    full_name: str = Field(min_length=1, max_length=150)
    role: EmployeeRole


class EmployeeUpdate(BaseModel):
    username: str | None = Field(default=None, min_length=3, max_length=100)
    password: str | None = Field(default=None, min_length=8, max_length=72)
    full_name: str | None = Field(default=None, min_length=1, max_length=150)
    role: EmployeeRole | None = None


class PatientCreate(BaseModel):
    patient_code: str | None = Field(default=None, max_length=50)
    full_name: str = Field(min_length=1, max_length=150)
    gender: str = Field(min_length=1, max_length=30)
    age: int = Field(ge=0, le=150)
    phone: str | None = Field(default=None, max_length=20)
    address: str | None = None


class PatientUpdate(BaseModel):
    patient_code: str | None = Field(default=None, min_length=1, max_length=50)
    full_name: str | None = Field(default=None, min_length=1, max_length=150)
    gender: str | None = Field(default=None, min_length=1, max_length=30)
    age: int | None = Field(default=None, ge=0, le=150)
    phone: str | None = Field(default=None, max_length=20)
    address: str | None = None


class PatientResponse(BaseSchema):
    id: int
    patient_code: str
    full_name: str
    gender: str
    age: int
    phone: str | None
    address: str | None
    created_at: datetime


class BillItemCreate(BaseModel):
    service_name: str = Field(min_length=1, max_length=200)
    quantity: int = Field(ge=1)
    unit_price: Decimal = Field(ge=0, max_digits=12, decimal_places=2)

    @field_validator("service_name")
    @classmethod
    def validate_service_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Service name must not be empty")
        return value


class BillItemResponse(BaseSchema):
    id: int
    bill_id: int
    service_name: str
    quantity: int
    unit_price: Decimal
    total: Decimal


class BillCreate(BaseModel):
    patient_id: int = Field(gt=0)
    discount: Decimal = Field(default=Decimal("0.00"), ge=0, le=100, max_digits=12, decimal_places=2)
    payment_mode: str = Field(min_length=1, max_length=50)
    items: list[BillItemCreate] = Field(min_length=1)


class BillUpdate(BaseModel):
    patient_id: int | None = Field(default=None, gt=0)
    discount: Decimal | None = Field(default=None, ge=0, le=100, max_digits=12, decimal_places=2)
    payment_mode: str | None = Field(default=None, min_length=1, max_length=50)


class BillResponse(BaseSchema):
    id: int
    invoice_number: str
    patient_id: int
    employee_id: int
    subtotal: Decimal
    discount: Decimal
    tax: Decimal
    grand_total: Decimal
    payment_mode: str
    created_at: datetime
    items: list[BillItemResponse]


class DashboardResponse(BaseModel):
    message: str
    employee: EmployeeResponse


class MessageResponse(BaseModel):
    message: str


class ServiceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    price: Decimal = Field(ge=0, max_digits=12, decimal_places=2)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Service name must not be empty")
        return value


class ServiceUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    price: Decimal | None = Field(default=None, ge=0, max_digits=12, decimal_places=2)


class ServiceResponse(BaseSchema):
    id: int
    name: str
    price: Decimal


class HospitalSettingsResponse(BaseModel):
    name: str
    address: str
    city: str
    state: str
    pin: str
    phone: str
    email: str
    gstin: str
    tax_rate: float


class HospitalSettingsUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    address: str = Field(min_length=1, max_length=200)
    city: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=1, max_length=100)
    pin: str = Field(min_length=1, max_length=20)
    phone: str = Field(min_length=1, max_length=50)
    email: str = Field(min_length=1, max_length=100)
    gstin: str = Field(min_length=1, max_length=100)
    tax_rate: float = Field(ge=0, le=100)


class AuditLogResponse(BaseModel):
    id: int
    employee_id: int | None
    action: str
    target_table: str
    target_id: str
    previous_state: str | None
    new_state: str | None
    timestamp: datetime
