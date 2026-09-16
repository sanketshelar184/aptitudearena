"""Brevo (formerly Sendinblue) Transactional Email Service.

Handles sending transactional emails for:
- Payment Confirmation Receipts
- Forgot Password Reset Links

Features:
- Responsive, branded HTML email templates
- Graceful development/test simulation fallback when BREVO_API_KEY is not set
- Asynchronous-safe execution with timeout guards
"""

import logging
import requests
from app.core.config import get_settings

logger = logging.getLogger(__name__)

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


def send_brevo_email(
    to_email: str,
    to_name: str | None,
    subject: str,
    html_content: str,
    text_content: str | None = None,
) -> bool:
    """Sends a transactional email using Brevo's REST API.
    
    If BREVO_API_KEY is not configured, logs the email details for local development.
    """
    settings = get_settings()
    recipient_name = to_name or to_email.split("@")[0]

    if not settings.brevo_api_key or not settings.brevo_api_key.strip():
        logger.info(
            f"\n=======================================================\n"
            f"[BREVO SIMULATION MODE - No API Key set]\n"
            f"To: {recipient_name} <{to_email}>\n"
            f"Subject: {subject}\n"
            f"-------------------------------------------------------\n"
            f"{text_content or 'HTML Email Generated (view in production)'}\n"
            f"======================================================="
        )
        return True

    payload = {
        "sender": {
            "name": settings.brevo_sender_name,
            "email": settings.brevo_sender_email,
        },
        "to": [
            {
                "email": to_email,
                "name": recipient_name,
            }
        ],
        "subject": subject,
        "htmlContent": html_content,
    }
    if text_content:
        payload["textContent"] = text_content

    headers = {
        "api-key": settings.brevo_api_key.strip(),
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    try:
        resp = requests.post(BREVO_API_URL, json=payload, headers=headers, timeout=15)
        if resp.status_code in (200, 201, 202):
            logger.info(f"Brevo email sent to {to_email} (status {resp.status_code}): {subject}")
            return True
        else:
            logger.error(f"Brevo API error ({resp.status_code}): {resp.text}")
            return False
    except Exception as e:
        logger.error(f"Failed to deliver email via Brevo to {to_email}: {e}")
        return False


def send_password_reset_email(to_email: str, to_name: str | None, reset_token: str) -> bool:
    """Sends a password reset link email."""
    settings = get_settings()
    base_url = settings.frontend_base_url.rstrip("/")
    reset_url = f"{base_url}/reset-password?token={reset_token}"
    display_name = to_name or to_email.split("@")[0]

    subject = "Reset Your AptitudeArena Password"
    text_content = (
        f"Hi {display_name},\n\n"
        f"We received a request to reset your AptitudeArena account password.\n\n"
        f"Click the link below to set a new password:\n{reset_url}\n\n"
        f"This link is valid for 30 minutes. If you did not request this, you can safely ignore this email.\n\n"
        f"Best regards,\nThe AptitudeArena Team"
    )

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
  <style>
    body {{ margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; }}
    .container {{ max-width: 580px; margin: 40px auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
    .header {{ background: #0f172a; padding: 32px 24px; text-align: center; color: #ffffff; }}
    .header h1 {{ margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }}
    .content {{ padding: 36px 32px; line-height: 1.6; font-size: 15px; color: #334155; }}
    .btn {{ display: inline-block; background-color: #2563eb; color: #ffffff !important; font-weight: 600; font-size: 14px; text-decoration: none; padding: 14px 28px; border-radius: 10px; margin: 24px 0; }}
    .btn:hover {{ background-color: #1d4ed8; }}
    .notice {{ background: #f1f5f9; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 6px; font-size: 13px; color: #475569; margin: 20px 0; }}
    .footer {{ background: #f8fafc; padding: 24px 32px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }}
    .link-alt {{ word-break: break-all; color: #2563eb; font-size: 12px; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>AptitudeArena</h1>
    </div>
    <div class="content">
      <h2 style="margin-top: 0; font-size: 20px; font-weight: 700; color: #0f172a;">Password Reset Request</h2>
      <p>Hi <strong>{display_name}</strong>,</p>
      <p>We received a request to reset the password for your AptitudeArena account. Click the button below to choose a new, secure password:</p>
      
      <div style="text-align: center;">
        <a href="{reset_url}" class="btn" target="_blank">Reset My Password</a>
      </div>

      <div class="notice">
        <strong>Security Notice:</strong> This link is active for <strong>30 minutes</strong> and can only be used once. If you did not initiate this request, your account remains completely secure and no changes have been made.
      </div>

      <p style="font-size: 13px; color: #64748b; margin-top: 24px;">
        Button not working? Copy and paste this URL into your browser:<br>
        <a href="{reset_url}" class="link-alt">{reset_url}</a>
      </p>
    </div>
    <div class="footer">
      &copy; 2026 AptitudeArena. Practice Faster. Score Better. Crack Placements.<br>
      India's dedicated placement aptitude preparation platform.
    </div>
  </div>
</body>
</html>"""

    return send_brevo_email(to_email, to_name, subject, html_content, text_content)


def send_payment_confirmation_email(
    to_email: str,
    to_name: str | None,
    order_id: str,
    product_name: str,
    amount_inr: float | int,
    access_type: str,
) -> bool:
    """Sends an official payment receipt and access activation confirmation."""
    settings = get_settings()
    dashboard_url = f"{settings.frontend_base_url.rstrip('/')}/dashboard"
    display_name = to_name or to_email.split("@")[0]

    subject = f"Payment Confirmed: Your AptitudeArena Access is Active ({product_name})"
    text_content = (
        f"Hi {display_name},\n\n"
        f"Thank you for your payment! Your transaction was successful.\n\n"
        f"Receipt Details:\n"
        f"- Product: {product_name}\n"
        f"- Amount Paid: INR {amount_inr}\n"
        f"- Order Reference: {order_id}\n"
        f"- Access: {access_type}\n\n"
        f"You can now access all your placement tests from your dashboard:\n{dashboard_url}\n\n"
        f"Best regards,\nThe AptitudeArena Team"
    )

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
  <style>
    body {{ margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; }}
    .container {{ max-width: 580px; margin: 40px auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
    .header {{ background: #0f172a; padding: 32px 24px; text-align: center; color: #ffffff; }}
    .header h1 {{ margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }}
    .badge {{ display: inline-block; background: #10b981; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px; }}
    .content {{ padding: 36px 32px; line-height: 1.6; font-size: 15px; color: #334155; }}
    .receipt-box {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 24px 0; }}
    .receipt-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #cbd5e1; font-size: 14px; }}
    .receipt-row:last-child {{ border-bottom: none; font-weight: 700; font-size: 16px; color: #0f172a; padding-top: 12px; }}
    .receipt-label {{ color: #64748b; }}
    .receipt-val {{ font-weight: 600; color: #0f172a; text-align: right; }}
    .btn {{ display: inline-block; background-color: #10b981; color: #ffffff !important; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 32px; border-radius: 10px; margin: 16px 0; }}
    .btn:hover {{ background-color: #059669; }}
    .footer {{ background: #f8fafc; padding: 24px 32px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="badge">Payment Verified</span>
      <h1>AptitudeArena</h1>
    </div>
    <div class="content">
      <h2 style="margin-top: 0; font-size: 20px; font-weight: 700; color: #0f172a;">Thank You for Your Order!</h2>
      <p>Hi <strong>{display_name}</strong>,</p>
      <p>Your payment has been successfully processed. Your placement preparation access has been activated on your account.</p>
      
      <div class="receipt-box">
        <div class="receipt-row">
          <span class="receipt-label">Item</span>
          <span class="receipt-val">{product_name}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Access Type</span>
          <span class="receipt-val">{access_type}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Order Ref</span>
          <span class="receipt-val" style="font-family: monospace; font-size: 12px;">{order_id}</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Status</span>
          <span class="receipt-val" style="color: #10b981;">PAID</span>
        </div>
        <div class="receipt-row">
          <span class="receipt-label">Total Amount</span>
          <span class="receipt-val">INR {amount_inr:.2f}</span>
        </div>
      </div>

      <div style="text-align: center;">
        <a href="{dashboard_url}" class="btn" target="_blank">Go to Student Dashboard &rarr;</a>
      </div>

      <p style="font-size: 13px; color: #64748b; margin-top: 24px; text-align: center;">
        Have questions or need assistance? Reply directly to this email or contact support.
      </p>
    </div>
    <div class="footer">
      &copy; 2026 AptitudeArena. Practice Faster. Score Better. Crack Placements.<br>
      India's dedicated placement aptitude preparation platform.
    </div>
  </div>
</body>
</html>"""

    return send_brevo_email(to_email, to_name, subject, html_content, text_content)
