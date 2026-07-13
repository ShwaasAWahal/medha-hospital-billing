import json
from datetime import datetime, UTC
from sqlalchemy import event, inspect, insert
from sqlalchemy.orm import object_session
from models import Patient, Bill, Service, Employee, HospitalSetting, AuditLog
from context import current_employee_var

def serialize_state(obj) -> dict:
    state = {}
    for column in obj.__table__.columns:
        if column.name in ("password_hash", "password"):
            continue
        val = getattr(obj, column.name)
        if isinstance(val, datetime):
            state[column.name] = val.isoformat()
        elif hasattr(val, "as_tuple") or hasattr(val, "__float__"):
            # Serialize Decimal and Float values safely
            state[column.name] = str(val)
        else:
            state[column.name] = val
    return state

def log_action(connection, action: str, target_table: str, target_id, prev_state: dict | None, new_state: dict | None, session=None):
    employee_id = None
    if session is not None:
        employee_id = session.info.get("employee_id")
    if employee_id is None:
        employee_id = current_employee_var.get()

    stmt = insert(AuditLog).values(
        employee_id=employee_id,
        action=action,
        target_table=target_table,
        target_id=str(target_id),
        previous_state=json.dumps(prev_state) if prev_state is not None else None,
        new_state=json.dumps(new_state) if new_state is not None else None,
        timestamp=datetime.now(UTC)
    )
    connection.execute(stmt)

@event.listens_for(Patient, "after_insert")
@event.listens_for(Bill, "after_insert")
@event.listens_for(Service, "after_insert")
@event.listens_for(Employee, "after_insert")
@event.listens_for(HospitalSetting, "after_insert")
def after_insert_listener(mapper, connection, target):
    session = object_session(target)
    new_state = serialize_state(target)
    pk_col = target.__table__.primary_key.columns.keys()[0]
    pk_val = getattr(target, pk_col)
    log_action(connection, "CREATE", target.__tablename__, pk_val, None, new_state, session=session)

@event.listens_for(Patient, "after_delete")
@event.listens_for(Bill, "after_delete")
@event.listens_for(Service, "after_delete")
@event.listens_for(Employee, "after_delete")
@event.listens_for(HospitalSetting, "after_delete")
def after_delete_listener(mapper, connection, target):
    session = object_session(target)
    prev_state = serialize_state(target)
    pk_col = target.__table__.primary_key.columns.keys()[0]
    pk_val = getattr(target, pk_col)
    log_action(connection, "DELETE", target.__tablename__, pk_val, prev_state, None, session=session)

@event.listens_for(Patient, "after_update")
@event.listens_for(Bill, "after_update")
@event.listens_for(Service, "after_update")
@event.listens_for(Employee, "after_update")
@event.listens_for(HospitalSetting, "after_update")
def after_update_listener(mapper, connection, target):
    session = object_session(target)
    prev_state = {}
    new_state = {}
    
    state = inspect(target)
    for attr in state.attrs:
        history = attr.history
        if history.has_changes():
            col_name = attr.key
            if col_name in ("password_hash", "password"):
                continue
            prev_val = history.deleted[0] if history.deleted else None
            new_val = attr.value
            
            if hasattr(prev_val, "as_tuple"):
                prev_val = str(prev_val)
            elif isinstance(prev_val, datetime):
                prev_val = prev_val.isoformat()
                
            if hasattr(new_val, "as_tuple"):
                new_val = str(new_val)
            elif isinstance(new_val, datetime):
                new_val = new_val.isoformat()
                
            prev_state[col_name] = prev_val
            new_state[col_name] = new_val
            
    if not prev_state and not new_state:
        return
        
    pk_col = target.__table__.primary_key.columns.keys()[0]
    pk_val = getattr(target, pk_col)
    log_action(connection, "UPDATE", target.__tablename__, pk_val, prev_state, new_state, session=session)
