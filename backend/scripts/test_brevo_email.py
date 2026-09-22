import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import get_settings
from app.services.email import send_brevo_email

def main():
    settings = get_settings()
    recipient = sys.argv[1] if len(sys.argv) > 1 else settings.initial_admin_email or "sanketshelar184@gmail.com"

    print("==================================================")
    print("Brevo (Sendinblue) Transactional Email Diagnostic")
    print("==================================================")
    print(f"[*] Brevo API Key: {settings.brevo_api_key[:15]}... (length: {len(settings.brevo_api_key) if settings.brevo_api_key else 0})" if settings.brevo_api_key else "[!] No BREVO_API_KEY configured")
    print(f"[*] Sender Email : {settings.brevo_sender_email}")
    print(f"[*] Sender Name  : {settings.brevo_sender_name}")
    print(f"[*] Target Email : {recipient}")
    print("--------------------------------------------------")

    subject = "🚀 AptitudeArena: Brevo API Integration Test"
    html_content = f"""<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px;">
  <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
    <h2 style="color: #2563eb; margin-top: 0;">AptitudeArena Email Verification</h2>
    <p>Success! Your Brevo transactional email API integration is working properly.</p>
    <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 13px;">
      Sender: {settings.brevo_sender_name} &lt;{settings.brevo_sender_email}&gt;<br>
      Status: Verified &amp; Operational
    </div>
    <p style="color: #64748b; font-size: 12px; margin-top: 20px;">This test email was triggered from AptitudeArena backend.</p>
  </div>
</body>
</html>"""

    success = send_brevo_email(
        to_email=recipient,
        to_name="AptitudeArena Admin",
        subject=subject,
        html_content=html_content,
        text_content="AptitudeArena: Your Brevo email API integration is verified and operational!"
    )

    if success:
        print("[OK] SUCCESS: Email successfully sent through Brevo!")
    else:
        print("[FAIL] ERROR: Could not send email. See Brevo API error log above.")

if __name__ == "__main__":
    main()
