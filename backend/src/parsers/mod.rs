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
        r"(?i)(?:RD\$|DOP|US\$|USD)\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d{2})|[0-9]+(?:\.\d{2})?)|(?:por|de)\s+(?:RD\$|DOP|US\$|USD)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.\d{2})|[0-9]+(?:\.\d{2})?)",
    )
    .map_err(|error| error.to_string())?;

    let captures = regex
        .captures(text)
        .ok_or_else(|| "Unable to extract transaction amount".to_string())?;
    let amount = captures
        .get(1)
        .or_else(|| captures.get(2))
        .map(|value| value.as_str().replace(',', ""))
        .ok_or_else(|| "Unable to extract transaction amount".to_string())?;

    amount
        .parse::<Decimal>()
        .map_err(|_| "Unable to parse transaction amount".to_string())
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
        r"(?i)(?:en|a)\s+([A-Z0-9][A-Z0-9 .&*'/-]{2,}?)(?:\s{2,}|$|,|\.|</|<)",
        r"(?i)(?:comercio|merchant)\s*:?[\s-]+([A-Z0-9][A-Z0-9 .&*'/-]{2,})",
    ];

    patterns.iter().find_map(|pattern| {
        Regex::new(pattern)
            .ok()
            .and_then(|regex| regex.captures(text))
            .and_then(|captures| captures.get(1))
            .map(|value| value.as_str().trim().to_string())
    })
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
    Regex::new(r"(?i)(?:tarjeta|card|tc|ending|terminada|finaliza(?:da)?)\D{0,10}([0-9]{4})")
        .ok()
        .and_then(|regex| regex.captures(text))
        .and_then(|captures| captures.get(1))
        .map(|value| value.as_str().to_string())
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
}
