"""
[H3] Audit logging utility.
Ghi lại mọi hành động nhạy cảm của admin/staff vào bảng audit_logs.
"""
from typing import Any, Optional
from fastapi import Request
from sqlalchemy.orm import Session
import models


def log_audit(
    db: Session,
    *,
    user_id: Optional[int],
    action: str,
    resource_type: str,
    resource_id: Optional[int] = None,
    details: Optional[dict] = None,
    request: Optional[Request] = None,
) -> models.AuditLog:
    """
    Ghi một audit log entry.

    Ví dụ:
        log_audit(db, user_id=admin.id, action="updated_product",
                  resource_type="product", resource_id=product_id,
                  details={"old_price": 100, "new_price": 120}, request=request)
    """
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

    if request:
        # Hỗ trợ proxy header X-Forwarded-For
        forwarded_for = request.headers.get("x-forwarded-for")
        ip_address = (forwarded_for.split(",")[0].strip() if forwarded_for
                      else (request.client.host if request.client else None))
        user_agent = request.headers.get("user-agent", "")[:255]

    entry = models.AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details or {},
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(entry)
    # Không commit ở đây — để caller commit cùng transaction chính
    return entry
