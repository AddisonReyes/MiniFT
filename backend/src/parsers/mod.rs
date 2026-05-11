pub mod banks;

use chrono::{DateTime, Utc};
use regex::Regex;
use rust_decimal::Decimal;

use crate::{email::ParsedEmail, models::transaction::TransactionType};

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct ParsedTransaction {
    pub amount: Decimal,
    pub currency: String,
    pub merchant: String,
    pub transaction_type: TransactionType,
    pub account_hint: Option<String>,
    pub card_last4: Option<String>,
    pub transaction_datetime: DateTime<Utc>,
}

pub trait BankEmailParser: Send + Sync {
    fn bank_name(&self) -> &'static str;
    fn can_parse(&self, sender: &str, subject: &str) -> bool;
    fn parse(&self, email: ParsedEmail) -> Result<ParsedTransaction, String>;
}

pub fn all_bank_parsers() -> Vec<Box<dyn BankEmailParser>> {
    vec![
        Box::new(banks::popular::PopularParser),
        Box::new(banks::banreservas::BanreservasParser),
        Box::new(banks::bhd::BhdParser),
        Box::new(banks::qik::QikParser),
        Box::new(banks::apap::ApapParser),
        Box::new(banks::scotiabank_rd::ScotiabankRdParser),
        Box::new(banks::asociacion_cibao::AsociacionCibaoParser),
        Box::new(banks::santa_cruz::SantaCruzParser),
    ]
}

pub fn parse_email_with_registered_parser(
    email: &ParsedEmail,
) -> Result<(&'static str, ParsedTransaction), String> {
    for parser in all_bank_parsers() {
        if parser.can_parse(&email.sender, &email.subject) {
            let bank_name = parser.bank_name();
            let parsed = parser.parse(email.clone())?;
            return Ok((bank_name, parsed));
        }
    }

    Err("No bank parser matched this email".to_string())
}

pub fn parse_with_bank_name(email: ParsedEmail) -> Result<ParsedTransaction, String> {
    let full_text = if email.full_text.contains(&email.subject) {
        email.full_text.clone()
    } else {
        format!("{} {}", email.subject, email.full_text)
    };
    let amount = extract_amount(&full_text)?;
    let currency = extract_currency(&full_text);
    let merchant = normalize_merchant(
        extract_merchant(&email.subject)
            .or_else(|| extract_merchant(&full_text))
            .unwrap_or_else(|| "Imported transaction".to_string()),
    );
    let transaction_type = infer_transaction_type(&full_text);
    let account_hint = extract_account_hint(&full_text);
    let card_last4 = extract_card_last4(&full_text);

    Ok(ParsedTransaction {
        amount,
        currency,
        merchant,
        transaction_type,
        account_hint,
        card_last4,
        transaction_datetime: email.sent_at,
    })
}

pub fn infer_category(parsed: &ParsedTransaction) -> String {
    let merchant = parsed.merchant.to_ascii_lowercase();

    if parsed.transaction_type == TransactionType::Income {
        return "Income".to_string();
    }

    if merchant.contains("netflix")
        || merchant.contains("spotify")
        || merchant.contains("youtube")
        || merchant.contains("apple")
    {
        return "Subscriptions".to_string();
    }

    if merchant.contains("uber")
        || merchant.contains("lyft")
        || merchant.contains("shell")
        || merchant.contains("texaco")
        || merchant.contains("petro")
    {
        return "Transport".to_string();
    }

    if merchant.contains("farmacia") || merchant.contains("pharma") {
        return "Health".to_string();
    }

    if merchant.contains("hotel") || merchant.contains("airbnb") || merchant.contains("booking") {
        return "Travel".to_string();
    }

    if merchant.contains("price smart")
        || merchant.contains("supermerc")
        || merchant.contains("jumbo")
        || merchant.contains("nacional")
        || merchant.contains("sirena")
    {
        return "Groceries".to_string();
    }

    if merchant.contains("atm") || merchant.contains("retiro") {
        return "Cash Withdrawal".to_string();
    }

    "Imported".to_string()
}

fn extract_amount(text: &str) -> Result<Decimal, String> {
    let regex = Regex::new(
        r"(?i)(?:RD\$|DOP|US\$|USD)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d{2})?|[0-9]+(?:\.\d{2})?|\.\d{2})|(?:por|de)\s+(?:RD\$|DOP|US\$|USD)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d{2})?|[0-9]+(?:\.\d{2})?|\.\d{2})",
    )
    .map_err(|error| error.to_string())?;

    let captures = regex
        .captures(text)
        .ok_or_else(|| "Unable to extract transaction amount".to_string())?;
    let amount = captures
        .get(1)
        .or_else(|| captures.get(2))
        .map(|value| normalize_amount_text(value.as_str()))
        .ok_or_else(|| "Unable to extract transaction amount".to_string())?;

    amount
        .parse::<Decimal>()
        .map_err(|_| "Unable to parse transaction amount".to_string())
}

fn normalize_amount_text(value: &str) -> String {
    let cleaned = value.replace(',', "");

    if cleaned.starts_with('.') {
        format!("0{cleaned}")
    } else {
        cleaned
    }
}

fn extract_currency(text: &str) -> String {
    let upper = text.to_ascii_uppercase();

    if upper.contains("RD$") || upper.contains("DOP") {
        "DOP".to_string()
    } else if upper.contains("US$") || upper.contains("USD") {
        "USD".to_string()
    } else {
        "DOP".to_string()
    }
}

fn extract_merchant(text: &str) -> Option<String> {
    let patterns = [
        r"(?is)monto\s+moneda\s+fecha\s+comercio\s+estatus\s+[\p{L}\d$.,]+\s+[\p{L}\s]+\s+\d{2}/\d{2}/\d{4}\s+([\p{L}\d .&*'/-]{2,}?)\s+(?:aprobad[ao]|approved)\b",
        r"(?is)fecha\s+moneda\s+monto\s+comercio\s+(?:estado|estatus)\s+\d{2}/\d{2}/\d{2}(?:\s+\d{1,2}:\d{2})?\s+[A-Z]{3}\s+[0-9,]+\.\d{2}\s+([\p{L}\d .&*'/-]{2,}?)\s+(?:aprobad[ao]|approved)\b",
        r"(?i)(?:en|a)\s+([\p{L}\d][\p{L}\d .&*'/-]{2,}?)\s+con\s+tu\s+tarjeta",
        r"(?i)(?:localidad|comercio|merchant)\s*:?[\s-]+([\p{L}\d][\p{L}\d .&*'/-]{2,})",
        r"(?i)(?:en|a)\s+([\p{L}\d][\p{L}\d .&*'/-]{2,}?)(?:\s{2,}|$|,|\.|</|<)",
    ];

    patterns.iter().find_map(|pattern| {
        Regex::new(pattern)
            .ok()
            .and_then(|regex| regex.captures(text))
            .and_then(|captures| captures.get(1))
            .map(|value| clean_extracted_merchant(value.as_str()))
            .filter(|value| !value.is_empty())
    })
}

fn clean_extracted_merchant(value: &str) -> String {
    let condensed = value.split_whitespace().collect::<Vec<_>>().join(" ");

    let trimmed = [
        r"(?i)\s+con\s+tu\s+tarjeta.*$",
        r"(?i)\s+(?:aprobad[ao]|approved).*$",
        r"(?i)\s+(?:estado|estatus|balance|monto|fecha|moneda).*$",
    ]
    .into_iter()
    .fold(condensed, |current, pattern| {
        Regex::new(pattern)
            .ok()
            .map(|regex| regex.replace(&current, "").to_string())
            .unwrap_or(current)
    });

    trimmed
        .trim_matches(|character: char| {
            character.is_whitespace() || matches!(character, ':' | ';' | ',' | '.')
        })
        .to_string()
}

fn extract_account_hint(text: &str) -> Option<String> {
    let lowered = text.to_ascii_lowercase();

    if lowered.contains("visa") {
        Some("Visa".to_string())
    } else if lowered.contains("mastercard") || lowered.contains("master card") {
        Some("Mastercard".to_string())
    } else if lowered.contains("debito") || lowered.contains("débito") {
        Some("Debit card".to_string())
    } else if lowered.contains("credito") || lowered.contains("crédito") {
        Some("Credit card".to_string())
    } else if lowered.contains("atm") {
        Some("ATM".to_string())
    } else {
        None
    }
}

fn extract_card_last4(text: &str) -> Option<String> {
    let anchored_patterns = [
        r"(?i)(?:ending|terminad[ao]?|termina|finaliza(?:da)?|last\s*4)\D{0,24}[0-9*Xx#\s-]{0,24}?([0-9]{4})",
        r"(?i)(?:tarjeta|card|tc)\D{0,80}[0-9*Xx#\s-]{0,24}?([0-9]{4})",
    ];

    for pattern in anchored_patterns {
        let Some(regex) = Regex::new(pattern).ok() else {
            continue;
        };

        if let Some(last4) = regex
            .captures_iter(text)
            .filter_map(|captures| captures.get(1))
            .map(|value| value.as_str().to_string())
            .last()
        {
            return Some(last4);
        }
    }

    None
}

fn infer_transaction_type(text: &str) -> TransactionType {
    let lowered = text.to_ascii_lowercase();

    if lowered.contains("deposito")
        || lowered.contains("depósito")
        || lowered.contains("credito recibido")
        || lowered.contains("crédito recibido")
        || lowered.contains("transferencia recibida")
    {
        TransactionType::Income
    } else {
        TransactionType::Expense
    }
}

pub fn normalize_merchant(value: String) -> String {
    let mut normalized = value
        .replace("PAYPAL *", "")
        .replace("PAYPAL*", "")
        .replace("POS ", "")
        .replace("COMPRA ", "")
        .replace("CONSUMO ", "")
        .replace("  ", " ")
        .trim_matches(|character: char| character == '-' || character == '*' || character == '.')
        .trim()
        .to_string();

    if normalized
        .chars()
        .all(|character| !character.is_lowercase())
    {
        normalized = normalized
            .split_whitespace()
            .map(title_case_word)
            .collect::<Vec<_>>()
            .join(" ");
    }

    normalized
}

fn title_case_word(word: &str) -> String {
    let mut characters = word.chars();
    let Some(first) = characters.next() else {
        return String::new();
    };

    format!(
        "{}{}",
        first.to_ascii_uppercase(),
        characters.as_str().to_ascii_lowercase()
    )
}

#[cfg(test)]
mod tests {
    use chrono::{TimeZone, Utc};

    use super::{infer_category, normalize_merchant, parse_with_bank_name, ParsedTransaction};
    use crate::{email::ParsedEmail, models::transaction::TransactionType};

    #[test]
    fn normalizes_paypal_prefixed_merchant() {
        assert_eq!(normalize_merchant("PAYPAL *NETFLIX".to_string()), "Netflix");
    }

    #[test]
    fn infers_groceries_category_from_pricesmart() {
        let category = infer_category(&ParsedTransaction {
            amount: "1250.00".parse().unwrap(),
            currency: "DOP".to_string(),
            merchant: "Price Smart".to_string(),
            transaction_type: TransactionType::Expense,
            account_hint: None,
            card_last4: Some("1234".to_string()),
            transaction_datetime: Utc.with_ymd_and_hms(2026, 5, 10, 10, 44, 0).unwrap(),
        });

        assert_eq!(category, "Groceries");
    }

    #[test]
    fn parses_amount_currency_and_merchant_from_common_alert() {
        let parsed = parse_with_bank_name(ParsedEmail {
            gmail_message_id: "1".to_string(),
            gmail_thread_id: Some("2".to_string()),
            raw_email_snippet: Some("Consumo por RD$1,250.00 en PRICE SMART".to_string()),
            sender: "alertas@popularenlinea.com".to_string(),
            subject: "Consumo por RD$1,250.00 en PRICE SMART".to_string(),
            sent_at: Utc.with_ymd_and_hms(2026, 5, 10, 10, 44, 0).unwrap(),
            plain_text_body: "Consumo por RD$1,250.00 en PRICE SMART".to_string(),
            html_body: None,
            full_text: "Consumo por RD$1,250.00 en PRICE SMART".to_string(),
        })
        .expect("parsed");

        assert_eq!(parsed.amount.to_string(), "1250.00");
        assert_eq!(parsed.currency, "DOP");
        assert_eq!(parsed.merchant, "Price Smart");
    }

    #[test]
    fn parses_qik_merchant_and_card_from_transaction_email() {
        let parsed = parse_with_bank_name(ParsedEmail {
            gmail_message_id: "qik-1".to_string(),
            gmail_thread_id: Some("qik-2".to_string()),
            raw_email_snippet: Some(
                "Se hizo una transaccion de RD$ 1,055.00 en PedidosYa*La Kasita By con tu tarjeta credito Qik que termina en 53************4624".to_string(),
            ),
            sender: "ayuda@qik.com.do".to_string(),
            subject: "Notificacion Qik".to_string(),
            sent_at: Utc.with_ymd_and_hms(2026, 5, 10, 20, 9, 0).unwrap(),
            plain_text_body: "Se hizo una transaccion de RD$ 1,055.00 en PedidosYa*La Kasita By con tu tarjeta credito Qik que termina en 53************4624 Localidad PedidosYa*La Kasita By Fecha y hora 05-10-2026 08:09 PM (AST) Monto RD$ 1,055.00".to_string(),
            html_body: None,
            full_text: "Se hizo una transaccion de RD$ 1,055.00 en PedidosYa*La Kasita By con tu tarjeta credito Qik que termina en 53************4624 Localidad PedidosYa*La Kasita By Fecha y hora 05-10-2026 08:09 PM (AST) Monto RD$ 1,055.00".to_string(),
        })
        .expect("parsed");

        assert_eq!(parsed.amount.to_string(), "1055.00");
        assert_eq!(parsed.currency, "DOP");
        assert_eq!(parsed.merchant, "PedidosYa*La Kasita By");
        assert_eq!(parsed.card_last4.as_deref(), Some("4624"));
    }

    #[test]
    fn parses_popular_table_merchant() {
        let parsed = parse_with_bank_name(ParsedEmail {
            gmail_message_id: "popular-1".to_string(),
            gmail_thread_id: Some("popular-2".to_string()),
            raw_email_snippet: Some(
                "Gracias por utilizar su VISA ISI, terminada en 1619.".to_string(),
            ),
            sender: "alertas@popularenlinea.com".to_string(),
            subject: "Transaccion aprobada".to_string(),
            sent_at: Utc.with_ymd_and_hms(2026, 5, 2, 18, 30, 0).unwrap(),
            plain_text_body: "Gracias por utilizar su VISA ISI, terminada en 1619. A continuacion le informamos el detalle de su transaccion: Monto Moneda Fecha Comercio Estatus US$.50 Dolar estadounidense 02/05/2026 GITHUB Aprobada".to_string(),
            html_body: None,
            full_text: "Gracias por utilizar su VISA ISI, terminada en 1619. A continuacion le informamos el detalle de su transaccion: Monto Moneda Fecha Comercio Estatus US$.50 Dolar estadounidense 02/05/2026 GITHUB Aprobada".to_string(),
        })
        .expect("parsed");

        assert_eq!(parsed.amount.to_string(), "0.50");
        assert_eq!(parsed.currency, "USD");
        assert_eq!(parsed.merchant, "Github");
        assert_eq!(parsed.card_last4.as_deref(), Some("1619"));
    }

    #[test]
    fn parses_banreservas_table_merchant() {
        let parsed = parse_with_bank_name(ParsedEmail {
            gmail_message_id: "banreservas-1".to_string(),
            gmail_thread_id: Some("banreservas-2".to_string()),
            raw_email_snippet: Some("Tu tarjeta ESTANDAR presenta un consumo.".to_string()),
            sender: "notificaciones@banreservas.com".to_string(),
            subject: "Notificaciones Banreservas".to_string(),
            sent_at: Utc.with_ymd_and_hms(2025, 5, 16, 16, 17, 0).unwrap(),
            plain_text_body: "Tu tarjeta ESTANDAR presenta un consumo. Detalle de Transaccion Fecha Moneda Monto Comercio Estado 16/05/25 16:17 DOP 6,152.11 BM CARGO GAZCUE SANTO DOMINGO Aprobada".to_string(),
            html_body: None,
            full_text: "Tu tarjeta ESTANDAR presenta un consumo. Detalle de Transaccion Fecha Moneda Monto Comercio Estado 16/05/25 16:17 DOP 6,152.11 BM CARGO GAZCUE SANTO DOMINGO Aprobada".to_string(),
        })
        .expect("parsed");

        assert_eq!(parsed.amount.to_string(), "6152.11");
        assert_eq!(parsed.currency, "DOP");
        assert_eq!(parsed.merchant, "Bm Cargo Gazcue Santo Domingo");
    }
}
