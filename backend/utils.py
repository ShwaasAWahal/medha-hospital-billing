"""Shared utility and billing calculation functions."""

from collections.abc import Mapping, Sequence
from decimal import ROUND_HALF_UP, Decimal
from typing import Any


MONEY_QUANTUM = Decimal("0.01")


def money(value: Decimal | int | str) -> Decimal:
    return Decimal(value).quantize(MONEY_QUANTUM, rounding=ROUND_HALF_UP)


def calculate_bill(
    items: Sequence[Mapping[str, Any]],
    discount: Decimal,
    tax_rate_percent: Decimal,
) -> tuple[list[dict[str, Any]], dict[str, Decimal]]:
    if not items:
        raise ValueError("A bill must contain at least one item")

    calculated_items: list[dict[str, Any]] = []
    subtotal = Decimal("0.00")

    for item in items:
        raw_service_name = item.get("service_name")
        service_name = (
            raw_service_name.strip() if isinstance(raw_service_name, str) else ""
        )
        quantity = int(item.get("quantity", 0))
        raw_unit_price = Decimal(item.get("unit_price", Decimal("0.00")))

        if not service_name:
            raise ValueError("Service name must not be empty")
        if quantity <= 0:
            raise ValueError("Quantity must be greater than zero")
        if raw_unit_price < 0:
            raise ValueError("Unit price must not be negative")

        unit_price = money(raw_unit_price)
        item_total = money(unit_price * quantity)
        subtotal += item_total
        calculated_items.append(
            {
                "service_name": service_name,
                "quantity": quantity,
                "unit_price": unit_price,
                "total": item_total,
            }
        )

    subtotal = money(subtotal)
    discount_percent = Decimal(discount)
    tax_rate_percent = Decimal(tax_rate_percent)

    if discount_percent < 0 or discount_percent > 100:
        raise ValueError("Discount percentage must be between 0 and 100")
    if tax_rate_percent < 0:
        raise ValueError("Tax rate must not be negative")

    discount_amount = money(subtotal * discount_percent / Decimal("100"))
    taxable_amount = subtotal - discount_amount
    tax = money(taxable_amount * tax_rate_percent / Decimal("100"))
    grand_total = money(taxable_amount + tax)

    totals = {
        "subtotal": subtotal,
        "discount": discount_amount,
        "tax": tax,
        "grand_total": grand_total,
    }
    return calculated_items, totals
