use crate::{
    email::ParsedEmail,
    parsers::{parse_with_bank_name, BankEmailParser, ParsedTransaction},
};

pub struct BanreservasParser;

impl BankEmailParser for BanreservasParser {
    fn bank_name(&self) -> &'static str {
        "Banreservas"
    }

    fn can_parse(&self, sender: &str, subject: &str) -> bool {
        format!("{sender} {subject}")
            .to_ascii_lowercase()
            .contains("banreservas")
    }

    fn parse(&self, email: ParsedEmail) -> Result<ParsedTransaction, String> {
        parse_with_bank_name(email)
    }
}
