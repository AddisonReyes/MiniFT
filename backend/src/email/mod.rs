use base64::{
    engine::general_purpose::{STANDARD, URL_SAFE, URL_SAFE_NO_PAD},
    Engine as _,
};
use chrono::{DateTime, TimeZone, Utc};
use quoted_printable::ParseMode;
use regex::Regex;
use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GmailListMessagesResponse {
    pub messages: Option<Vec<GmailMessageListItem>>,
    pub next_page_token: Option<String>,
    pub result_size_estimate: Option<i64>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GmailMessageListItem {
    pub id: String,
    pub thread_id: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GmailProfileResponse {
    pub email_address: String,
    pub history_id: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GmailMessage {
    pub id: String,
    pub thread_id: Option<String>,
    pub history_id: Option<String>,
    pub snippet: Option<String>,
    pub internal_date: Option<String>,
    pub payload: Option<GmailMessagePart>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GmailMessagePart {
    pub mime_type: Option<String>,
    pub headers: Option<Vec<GmailHeader>>,
    pub body: Option<GmailMessagePartBody>,
    pub parts: Option<Vec<GmailMessagePart>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GmailHeader {
    pub name: String,
    pub value: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct GmailMessagePartBody {
    pub data: Option<String>,
}

#[derive(Debug, Clone)]
pub struct ParsedEmail {
    pub gmail_message_id: String,
    pub gmail_thread_id: Option<String>,
    pub raw_email_snippet: Option<String>,
    pub sender: String,
    pub subject: String,
    pub sent_at: DateTime<Utc>,
    pub plain_text_body: String,
    pub html_body: Option<String>,
    pub full_text: String,
}

pub fn parse_gmail_message(message: &GmailMessage) -> Result<ParsedEmail, String> {
    let payload = message
        .payload
        .as_ref()
        .ok_or_else(|| "Gmail message payload is missing".to_string())?;
    let sender = find_header(payload, "From").unwrap_or_default();
    let subject = find_header(payload, "Subject").unwrap_or_default();
    let sent_at = parse_sent_at(
        find_header(payload, "Date").as_deref(),
        message.internal_date.as_deref(),
    )?;

    let mut plain_parts = Vec::new();
    let mut html_parts = Vec::new();
    collect_bodies(payload, None, &mut plain_parts, &mut html_parts);

    let plain_text_body = normalize_whitespace(&plain_parts.join("\n\n"));
    let html_body = (!html_parts.is_empty()).then(|| html_parts.join("\n"));
    let full_text = if plain_text_body.is_empty() {
        normalize_whitespace(&strip_html_tags(html_body.as_deref().unwrap_or_default()))
    } else if let Some(html) = html_body.as_deref() {
        format!(
            "{}\n\n{}",
            plain_text_body,
            normalize_whitespace(&strip_html_tags(html))
        )
        .trim()
        .to_string()
    } else {
        plain_text_body.clone()
    };

    Ok(ParsedEmail {
        gmail_message_id: message.id.clone(),
        gmail_thread_id: message.thread_id.clone(),
        raw_email_snippet: message.snippet.clone(),
        sender,
        subject,
        sent_at,
        plain_text_body,
        html_body,
        full_text,
    })
}

fn collect_bodies(
    part: &GmailMessagePart,
    inherited_encoding: Option<&str>,
    plain_parts: &mut Vec<String>,
    html_parts: &mut Vec<String>,
) {
    let transfer_encoding = find_header_value(part.headers.as_ref(), "Content-Transfer-Encoding")
        .or(inherited_encoding.map(str::to_string));

    if let Some(parts) = part.parts.as_ref() {
        for child in parts {
            collect_bodies(child, transfer_encoding.as_deref(), plain_parts, html_parts);
        }
    }

    let Some(data) = part.body.as_ref().and_then(|body| body.data.as_ref()) else {
        return;
    };
    let decoded = decode_message_data(data, transfer_encoding.as_deref());
    let mime_type = part
        .mime_type
        .as_deref()
        .unwrap_or_default()
        .to_ascii_lowercase();

    if mime_type.starts_with("text/plain") {
        plain_parts.push(decoded);
    } else if mime_type.starts_with("text/html") {
        html_parts.push(decoded);
    }
}

fn find_header(part: &GmailMessagePart, name: &str) -> Option<String> {
    find_header_value(part.headers.as_ref(), name)
}

fn find_header_value(headers: Option<&Vec<GmailHeader>>, name: &str) -> Option<String> {
    headers.and_then(|headers| {
        headers
            .iter()
            .find(|header| header.name.eq_ignore_ascii_case(name))
            .map(|header| header.value.trim().to_string())
    })
}

fn decode_message_data(data: &str, transfer_encoding: Option<&str>) -> String {
    let decoded_bytes = URL_SAFE_NO_PAD
        .decode(data)
        .or_else(|_| URL_SAFE.decode(data))
        .or_else(|_| STANDARD.decode(data))
        .unwrap_or_default();

    match transfer_encoding {
        Some(value) if value.eq_ignore_ascii_case("quoted-printable") => {
            quoted_printable::decode(&decoded_bytes, ParseMode::Robust)
                .ok()
                .map(|bytes| String::from_utf8_lossy(&bytes).to_string())
                .unwrap_or_else(|| String::from_utf8_lossy(&decoded_bytes).to_string())
        }
        _ => String::from_utf8_lossy(&decoded_bytes).to_string(),
    }
}

fn parse_sent_at(
    date_header: Option<&str>,
    internal_date: Option<&str>,
) -> Result<DateTime<Utc>, String> {
    if let Some(date_header) = date_header {
        if let Ok(parsed) = DateTime::parse_from_rfc2822(date_header) {
            return Ok(parsed.with_timezone(&Utc));
        }

        if let Ok(parsed) = DateTime::parse_from_rfc3339(date_header) {
            return Ok(parsed.with_timezone(&Utc));
        }
    }

    if let Some(internal_date) = internal_date {
        if let Ok(milliseconds) = internal_date.parse::<i64>() {
            if let Some(parsed) = Utc.timestamp_millis_opt(milliseconds).single() {
                return Ok(parsed);
            }
        }
    }

    Err("Unable to determine email sent date".to_string())
}

fn strip_html_tags(value: &str) -> String {
    let tags = Regex::new(r"(?is)<[^>]+>").expect("valid html tag regex");

    tags.replace_all(value, " ")
        .replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
}

pub fn normalize_whitespace(value: &str) -> String {
    value.split_whitespace().collect::<Vec<_>>().join(" ")
}

#[cfg(test)]
mod tests {
    use super::{normalize_whitespace, parse_sent_at, strip_html_tags};

    #[test]
    fn strips_html_tags_and_entities() {
        let cleaned = strip_html_tags("<p>Compra&nbsp;<strong>PRICE SMART</strong></p>");

        assert_eq!(normalize_whitespace(&cleaned), "Compra PRICE SMART");
    }

    #[test]
    fn parses_rfc_2822_email_date() {
        let parsed = parse_sent_at(
            Some("Sun, 10 May 2026 10:44:00 -0400"),
            Some("1746888240000"),
        )
        .expect("date");

        assert_eq!(parsed.to_rfc3339(), "2026-05-10T14:44:00+00:00");
    }
}
