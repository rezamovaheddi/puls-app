"""
Email service for Pulse notifications and invitations.
Handles SMTP delivery with graceful fallback and clean HTML formatting.
"""

from __future__ import annotations

import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)


def send_invitation_email(
    *,
    to_email: str,
    workspace_name: str,
    inviter_name: str,
    role: str,
    token: str,
) -> bool:
    """
    Sends an invitation email with a confirmation link to join a workspace/project.
    """
    frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3210").rstrip("/")
    invite_url = f"{frontend_url}/invite/{token}"
    subject = f"You're invited to join {workspace_name} on Pulse"

    plain_message = (
        f"Hello,\n\n"
        f"{inviter_name} has invited you to join '{workspace_name}' on Pulse with the role of {role}.\n\n"
        f"Accept the invitation by clicking the link below:\n"
        f"{invite_url}\n\n"
        f"This link will expire in 7 days.\n\n"
        f"— The Pulse Team"
    )

    html_message = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; margin: 0; padding: 40px 20px; }}
        .container {{ max-width: 520px; margin: 0 auto; background-color: #121214; border: 1px solid #27272a; border-radius: 12px; padding: 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.4); }}
        .header {{ display: flex; align-items: center; gap: 8px; margin-bottom: 24px; }}
        .logo {{ font-size: 20px; font-weight: 700; color: #fafafa; letter-spacing: -0.5px; }}
        h1 {{ font-size: 20px; font-weight: 600; color: #fafafa; margin: 0 0 16px 0; }}
        p {{ font-size: 14px; line-height: 1.6; color: #a1a1aa; margin: 0 0 20px 0; }}
        .badge {{ display: inline-block; padding: 4px 10px; background-color: #27272a; color: #38bdf8; border-radius: 6px; font-size: 13px; font-weight: 500; margin-bottom: 24px; }}
        .cta-btn {{ display: inline-block; width: 100%; text-align: center; background-color: #fafafa; color: #09090b; padding: 12px 24px; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px; box-sizing: border-box; }}
        .footer {{ margin-top: 32px; padding-top: 20px; border-top: 1px solid #27272a; font-size: 12px; color: #71717a; text-align: center; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">⚡ Pulse</div>
        <h1>Workspace Invitation</h1>
        <p><strong style="color: #fafafa;">{inviter_name}</strong> invited you to collaborate in <strong style="color: #fafafa;">{workspace_name}</strong>.</p>
        <div><span class="badge">Assigned Role: {role}</span></div>
        <a href="{invite_url}" class="cta-btn">Accept Invitation</a>
        <p style="margin-top: 24px; font-size: 12px; color: #71717a;">Or copy and paste this link into your browser:<br/><span style="color: #a1a1aa; word-break: break-all;">{invite_url}</span></p>
        <div class="footer">
          This invitation expires in 7 days.<br/>
          Pulse — Modern engineering management.
        </div>
      </div>
    </body>
    </html>
    """

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=plain_message,
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", "Pulse <no-reply@pulse.dev>"),
            to=[to_email],
        )
        msg.attach_alternative(html_message, "text/html")
        msg.send(fail_silently=False)
        logger.info("Sent invitation email to %s for workspace %s", to_email, workspace_name)
        return True
    except Exception as exc:
        logger.warning("Failed to send invitation email via SMTP to %s: %s", to_email, exc)
        return False
