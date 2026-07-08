"""Database create, read, update, and delete operations."""

from collections.abc import Mapping, Sequence
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any, TypeVar

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session, joinedload, selectinload

from config import get_settings
from models import Bill, BillItem, Employee, Patient, Service
from utils import calculate_bill


ModelType = TypeVar("ModelType", Bill, BillItem, Employee, Patient, Service)

PATIENT_FIELDS = {
    "patient_code",
    "full_name",
    "gender",
    "age",
    "phone",
    "address",
}
BILL_CREATE_FIELDS = {"patient_id", "employee_id", "discount", "payment_mode"}
BILL_UPDATE_FIELDS = {"patient_id", "discount", "payment_mode"}
BILL_ITEM_FIELDS = {"service_name", "quantity", "unit_price"}
EMPLOYEE_FIELDS = {"username", "password_hash", "full_name", "role"}
SERVICE_FIELDS = {"name", "price"}


def _validated_values(
    values: Mapping[str, Any], allowed_fields: set[str]
) -> dict[str, Any]:
    unknown_fields = set(values) - allowed_fields
    if unknown_fields:
        names = ", ".join(sorted(unknown_fields))
        raise ValueError(f"Unsupported fields: {names}")
    return dict(values)


def _save(db: Session, instance: ModelType) -> ModelType:
    try:
        db.add(instance)
        db.commit()
        db.refresh(instance)
    except Exception:
        db.rollback()
        raise
    return instance


def _delete(db: Session, instance: ModelType) -> None:
    try:
        db.delete(instance)
        db.commit()
    except Exception:
        db.rollback()
        raise


def _apply_updates(
    db: Session,
    instance: ModelType,
    values: Mapping[str, Any],
    allowed_fields: set[str],
) -> ModelType:
    for field, value in _validated_values(values, allowed_fields).items():
        setattr(instance, field, value)
    return _save(db, instance)


def _with_pagination(
    statement: Select[Any], offset: int, limit: int | None
) -> Select[Any]:
    statement = statement.offset(offset)
    return statement.limit(limit) if limit is not None else statement


# Patients


def create_patient(db: Session, values: Mapping[str, Any]) -> Patient:
    patient = Patient(**_validated_values(values, PATIENT_FIELDS))
    return _save(db, patient)


def update_patient(
    db: Session, patient_id: int, values: Mapping[str, Any]
) -> Patient | None:
    patient = db.get(Patient, patient_id)
    if patient is None:
        return None
    return _apply_updates(db, patient, values, PATIENT_FIELDS)


def delete_patient(db: Session, patient_id: int) -> bool:
    patient = db.get(Patient, patient_id)
    if patient is None:
        return False
    _delete(db, patient)
    return True


def search_patients_by_phone(db: Session, phone: str) -> list[Patient]:
    statement = select(Patient).where(Patient.phone == phone).order_by(Patient.id)
    return list(db.scalars(statement).all())


def get_patient_by_code(db: Session, patient_code: str) -> Patient | None:
    statement = select(Patient).where(Patient.patient_code == patient_code)
    return db.scalar(statement)


def get_patient_by_id(db: Session, patient_id: int) -> Patient | None:
    return db.get(Patient, patient_id)


def get_all_patients(
    db: Session, offset: int = 0, limit: int | None = None
) -> list[Patient]:
    statement = _with_pagination(
        select(Patient).order_by(Patient.id), offset, limit
    )
    return list(db.scalars(statement).all())


# Bills


def _next_invoice_number(db: Session) -> str:
    year = datetime.now(UTC).year

    # PostgreSQL transaction-level locking serializes invoice allocation.
    if db.get_bind().dialect.name == "postgresql":
        db.execute(select(func.pg_advisory_xact_lock(0x4842, year)))

    prefix = f"HB{year}"
    statement = select(func.max(Bill.invoice_number)).where(
        Bill.invoice_number.like(f"{prefix}_____")
    )
    latest_invoice = db.scalar(statement)

    if latest_invoice is None:
        sequence = 1
    else:
        suffix = latest_invoice.removeprefix(prefix)
        if len(suffix) != 5 or not suffix.isdigit():
            raise ValueError("Existing invoice number has an invalid format")
        sequence = int(suffix) + 1

    if sequence > 99999:
        raise ValueError(f"Invoice number limit reached for {year}")
    return f"{prefix}{sequence:05d}"


def _item_values(item: BillItem) -> dict[str, Any]:
    return {
        "service_name": item.service_name,
        "quantity": item.quantity,
        "unit_price": item.unit_price,
    }


def _set_bill_calculation(
    bill: Bill,
    calculated_items: Sequence[Mapping[str, Any]],
    totals: Mapping[str, Decimal],
) -> None:
    for item, calculated_item in zip(bill.items, calculated_items, strict=True):
        item.service_name = calculated_item["service_name"]
        item.quantity = calculated_item["quantity"]
        item.unit_price = calculated_item["unit_price"]
        item.total = calculated_item["total"]

    bill.subtotal = totals["subtotal"]
    bill.discount = totals["discount"]
    bill.tax = totals["tax"]
    bill.grand_total = totals["grand_total"]


def create_bill(
    db: Session,
    values: Mapping[str, Any],
    items: Sequence[Mapping[str, Any]] | None = None,
) -> Bill:
    bill_values = _validated_values(values, BILL_CREATE_FIELDS)
    discount = bill_values.pop("discount", Decimal("0.00"))
    raw_items = [
        _validated_values(item_values, BILL_ITEM_FIELDS)
        for item_values in (items or ())
    ]
    calculated_items, totals = calculate_bill(
        raw_items,
        discount,
        get_settings().tax_rate_percent,
    )

    bill = Bill(
        invoice_number=_next_invoice_number(db),
        **bill_values,
        **totals,
    )
    bill.items = [BillItem(**item_values) for item_values in calculated_items]
    return _save(db, bill)


def get_bill(db: Session, bill_id: int) -> Bill | None:
    statement = (
        select(Bill)
        .options(
            joinedload(Bill.patient),
            joinedload(Bill.employee),
            selectinload(Bill.items),
        )
        .where(Bill.id == bill_id)
    )
    return db.scalar(statement)


def get_all_bills(
    db: Session, offset: int = 0, limit: int | None = None
) -> list[Bill]:
    statement = _with_pagination(
        select(Bill).options(selectinload(Bill.items)).order_by(Bill.id),
        offset,
        limit,
    )
    return list(db.scalars(statement).all())


def update_bill(
    db: Session, bill_id: int, values: Mapping[str, Any]
) -> Bill | None:
    bill = db.get(Bill, bill_id)
    if bill is None:
        return None

    bill_values = _validated_values(values, BILL_UPDATE_FIELDS)
    if "discount" in bill_values:
        discount_percent = Decimal(bill_values["discount"])
    else:
        discount_percent = (bill.discount / bill.subtotal * Decimal("100")) if bill.subtotal > 0 else Decimal("0.00")

    calculated_items, totals = calculate_bill(
        [_item_values(item) for item in bill.items],
        discount_percent,
        get_settings().tax_rate_percent,
    )

    try:
        for field, value in bill_values.items():
            setattr(bill, field, value)
        _set_bill_calculation(bill, calculated_items, totals)
        return _save(db, bill)
    except Exception:
        db.rollback()
        raise


def delete_bill(db: Session, bill_id: int) -> bool:
    bill = db.get(Bill, bill_id)
    if bill is None:
        return False
    _delete(db, bill)
    return True


# Bill items


def add_bill_item(
    db: Session, bill_id: int, values: Mapping[str, Any]
) -> BillItem | None:
    bill = db.get(Bill, bill_id)
    if bill is None:
        return None

    new_item_values = _validated_values(values, BILL_ITEM_FIELDS)
    discount_percent = (bill.discount / bill.subtotal * Decimal("100")) if bill.subtotal > 0 else Decimal("0.00")
    calculated_items, totals = calculate_bill(
        [*[_item_values(item) for item in bill.items], new_item_values],
        discount_percent,
        get_settings().tax_rate_percent,
    )
    item = BillItem(**calculated_items[-1])

    try:
        bill.items.append(item)
        _set_bill_calculation(bill, calculated_items, totals)
        _save(db, bill)
        db.refresh(item)
        return item
    except Exception:
        db.rollback()
        raise


def remove_bill_item(db: Session, item_id: int) -> bool:
    item = db.get(BillItem, item_id)
    if item is None:
        return False

    bill = item.bill
    remaining_items = [existing for existing in bill.items if existing.id != item_id]
    discount_percent = (bill.discount / bill.subtotal * Decimal("100")) if bill.subtotal > 0 else Decimal("0.00")
    calculated_items, totals = calculate_bill(
        [_item_values(existing) for existing in remaining_items],
        discount_percent,
        get_settings().tax_rate_percent,
    )

    try:
        bill.items.remove(item)
        _set_bill_calculation(bill, calculated_items, totals)
        _save(db, bill)
    except Exception:
        db.rollback()
        raise
    return True


# Employees


def create_employee(db: Session, values: Mapping[str, Any]) -> Employee:
    employee = Employee(**_validated_values(values, EMPLOYEE_FIELDS))
    return _save(db, employee)


def update_employee(
    db: Session, employee_id: int, values: Mapping[str, Any]
) -> Employee | None:
    employee = db.get(Employee, employee_id)
    if employee is None:
        return None
    return _apply_updates(db, employee, values, EMPLOYEE_FIELDS)


def delete_employee(db: Session, employee_id: int) -> bool:
    employee = db.get(Employee, employee_id)
    if employee is None:
        return False
    _delete(db, employee)
    return True


def get_all_employees(
    db: Session, offset: int = 0, limit: int | None = None
) -> list[Employee]:
    statement = _with_pagination(
        select(Employee).order_by(Employee.id), offset, limit
    )
    return list(db.scalars(statement).all())


def get_employee_by_id(db: Session, employee_id: int) -> Employee | None:
    return db.get(Employee, employee_id)


def get_employee_by_username(db: Session, username: str) -> Employee | None:
    statement = select(Employee).where(Employee.username == username)
    return db.scalar(statement)


# Services

def create_service(db: Session, values: Mapping[str, Any]) -> Service:
    service = Service(**_validated_values(values, SERVICE_FIELDS))
    return _save(db, service)


def update_service(
    db: Session, service_id: int, values: Mapping[str, Any]
) -> Service | None:
    service = db.get(Service, service_id)
    if service is None:
        return None
    return _apply_updates(db, service, values, SERVICE_FIELDS)


def delete_service(db: Session, service_id: int) -> bool:
    service = db.get(Service, service_id)
    if service is None:
        return False
    _delete(db, service)
    return True


def get_service_by_id(db: Session, service_id: int) -> Service | None:
    return db.get(Service, service_id)


def get_all_services(
    db: Session, offset: int = 0, limit: int | None = None
) -> list[Service]:
    statement = _with_pagination(
        select(Service).order_by(Service.name), offset, limit
    )
    return list(db.scalars(statement).all())
