use resend_rs::types::CreateEmailBaseOptions;

use crate::{
    config::EmailState,
    errors::ApiError,
    logging::{self, field},
};

pub enum PasswordCodeEmailKind {
    Reset,
    Change,
}

fn email_shell(
    eyebrow: &str,
    title: &str,
    body: &str,
    detail: &str,
    cta_label: Option<&str>,
    cta_href: Option<&str>,
    code: Option<&str>,
) -> (String, String) {
    let button_html = match (cta_label, cta_href) {
        (Some(label), Some(href)) => format!(
            r#"
              <tr>
                <td style="padding: 0 32px 24px;">
                  <a
                    href="{href}"
                    style="display:inline-block;border-radius:18px;background:#7AE7B9;color:#0B0D12;padding:14px 20px;font-family:'Space Grotesk',Arial,sans-serif;font-size:14px;font-weight:700;text-decoration:none;"
                  >
                    {label}
                  </a>
                </td>
              </tr>
            "#
        ),
        _ => String::new(),
    };
    let code_html = code.map_or_else(String::new, |value| {
        format!(
            r#"
              <tr>
                <td style="padding: 0 32px 24px;">
                  <div style="border:1px solid rgba(255,255,255,0.08);border-radius:20px;background:#090C11;padding:18px 20px;text-align:center;font-family:'IBM Plex Mono',ui-monospace,SFMono-Regular,monospace;font-size:28px;font-weight:600;letter-spacing:0.22em;color:#F3F5F7;">
                    {value}
                  </div>
                </td>
              </tr>
            "#
        )
    });

    let html = format!(
        r#"<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#090C11;color:#F3F5F7;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;border-collapse:collapse;border:1px solid rgba(255,255,255,0.08);border-radius:28px;overflow:hidden;background:linear-gradient(180deg,#121722 0%,#0E131D 100%);box-shadow:0 20px 70px rgba(0,0,0,0.35);">
            <tr>
              <td style="padding:32px 32px 20px;">
                <div style="display:inline-block;border:1px solid rgba(255,255,255,0.1);border-radius:999px;padding:8px 14px;background:rgba(9,12,17,0.55);font-family:'Space Grotesk',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.26em;text-transform:uppercase;color:#7AE7B9;">
                  MiniFT
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 12px;font-family:'Space Grotesk',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.26em;text-transform:uppercase;color:#7AE7B9;">
                {eyebrow}
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 12px;font-family:'Space Grotesk',Arial,sans-serif;font-size:34px;font-weight:700;line-height:1.05;color:#F3F5F7;">
                {title}
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 12px;font-family:'Space Grotesk',Arial,sans-serif;font-size:15px;line-height:1.8;color:#99A3BA;">
                {body}
              </td>
            </tr>
            {code_html}
            {button_html}
            <tr>
              <td style="padding:0 32px 32px;font-family:'Space Grotesk',Arial,sans-serif;font-size:13px;line-height:1.7;color:#99A3BA;">
                {detail}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>"#
    );

    let mut text_sections = vec![
        "MiniFT".to_string(),
        eyebrow.to_string(),
        title.to_string(),
        body.replace("<strong>", "").replace("</strong>", ""),
    ];

    if let Some(value) = code {
        text_sections.push(format!("Code: {value}"));
    }

    if let Some(href) = cta_href {
        text_sections.push(format!("Link: {href}"));
    }

    text_sections.push(detail.to_string());

    (html, text_sections.join("\n\n"))
}

async fn send_email(
    email_state: &EmailState,
    to: &str,
    subject: &str,
    html: String,
    text: String,
    log_event: &str,
) -> Result<(), ApiError> {
    let email = CreateEmailBaseOptions::new(email_state.config.from_email.clone(), [to], subject)
        .with_html(&html)
        .with_text(&text);

    email_state
        .client
        .emails
        .send(email)
        .await
        .map_err(|error| {
            logging::error(
                log_event,
                &[field("to", to), field("error", error.to_string())],
            );
            ApiError::internal("Unable to send email right now")
        })?;

    logging::info(log_event, &[field("to", to), field("status", "sent")]);

    Ok(())
}

pub async fn send_verification_email(
    email_state: &EmailState,
    to: &str,
    verification_token: &str,
) -> Result<(), ApiError> {
    let verification_link = format!(
        "{}/verify-email?token={verification_token}",
        email_state.config.app_base_url
    );
    let detail = format!(
        "This link expires in {} hours. If you did not create this account, you can ignore this message.",
        email_state.config.verification_ttl_hours
    );
    let (html, text) = email_shell(
        "Verify email",
        "Confirm your MiniFT account",
        "Finish creating your workspace by verifying this email address. Once confirmed, MiniFT will open your app session automatically.",
        &detail,
        Some("Verify account"),
        Some(&verification_link),
        None,
    );

    send_email(
        email_state,
        to,
        "Verify your MiniFT account",
        html,
        text,
        "email.verification.sent",
    )
    .await
}

pub async fn send_password_code_email(
    email_state: &EmailState,
    to: &str,
    code: &str,
    kind: PasswordCodeEmailKind,
) -> Result<(), ApiError> {
    let (eyebrow, title, body, subject) = match kind {
        PasswordCodeEmailKind::Reset => (
            "Password reset",
            "Use this code to reset your password",
            "Enter this code in MiniFT, then choose a new password for your account.",
            "Your MiniFT password reset code",
        ),
        PasswordCodeEmailKind::Change => (
            "Password change",
            "Confirm your password change",
            "Enter this code in MiniFT settings to confirm the password change for your current account.",
            "Your MiniFT password change code",
        ),
    };
    let detail = format!(
        "This code expires in {} minutes. For your security, only the latest code remains active.",
        email_state.config.password_reset_code_ttl_minutes
    );
    let (html, text) = email_shell(eyebrow, title, body, &detail, None, None, Some(code));

    send_email(
        email_state,
        to,
        subject,
        html,
        text,
        "email.password_code.sent",
    )
    .await
}
