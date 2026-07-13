from contextvars import ContextVar

# ContextVar to store the current employee ID during the request context.
current_employee_var: ContextVar[int | None] = ContextVar("current_employee_id", default=None)
