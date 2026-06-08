"""
Email utilities — gửi email reset mật khẩu, xác nhận tài khoản.
Cấu hình qua .env:
  MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM, MAIL_SERVER, MAIL_PORT
"""
import os
import smtplib
import secrets
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional


def generate_reset_token(length: int = 64) -> str:
    """Sinh token ngẫu nhiên an toàn cho password reset."""
    return secrets.token_urlsafe(length)


def _get_smtp_config() -> dict:
    return {
        "host": os.getenv("MAIL_SERVER", "smtp.gmail.com"),
        "port": int(os.getenv("MAIL_PORT", "587")),
        "username": os.getenv("MAIL_USERNAME", ""),
        "password": os.getenv("MAIL_PASSWORD", ""),
        "from_email": os.getenv("MAIL_FROM", os.getenv("MAIL_USERNAME", "noreply@freshfood.ai")),
        "use_tls": os.getenv("MAIL_USE_TLS", "true").lower() in {"1", "true", "yes"},
    }


def send_password_reset_email(to_email: str, reset_token: str, full_name: Optional[str] = None) -> bool:
    """
    Gửi email chứa link reset mật khẩu.
    Trả về True nếu gửi thành công, False nếu thất bại.

    Trong môi trường dev (MAIL_USERNAME rỗng), in token ra console thay vì gửi thật.
    """
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"
    display_name = full_name or to_email

    subject = "FreshFood AI — Đặt lại mật khẩu"
    html_body = f"""
    <html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #16a34a;">🌿 FreshFood AI</h2>
      <p>Xin chào <strong>{display_name}</strong>,</p>
      <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
      <p style="margin: 24px 0;">
        <a href="{reset_link}"
           style="background:#16a34a;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">
          Đặt lại mật khẩu
        </a>
      </p>
      <p style="color:#6b7280;font-size:14px;">
        Link có hiệu lực trong <strong>15 phút</strong>. Nếu bạn không yêu cầu, hãy bỏ qua email này.
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
      <p style="color:#9ca3af;font-size:12px;">FreshFood AI — Thực phẩm tươi, AI đảm bảo.</p>
    </body></html>
    """

    cfg = _get_smtp_config()

    # Dev fallback — không có SMTP config thì log ra console
    if not cfg["username"] or not cfg["password"]:
        print(f"\n[DEV] Password reset token for {to_email}: {reset_token}")
        print(f"[DEV] Reset link: {reset_link}\n")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = cfg["from_email"]
        msg["To"] = to_email
        msg.attach(MIMEText(html_body, "html", "utf-8"))

        with smtplib.SMTP(cfg["host"], cfg["port"], timeout=10) as server:
            if cfg["use_tls"]:
                server.starttls()
            server.login(cfg["username"], cfg["password"])
            server.sendmail(cfg["from_email"], to_email, msg.as_string())
        return True
    except Exception as exc:
        print(f"[ERROR] Failed to send email to {to_email}: {exc}")
        return False
