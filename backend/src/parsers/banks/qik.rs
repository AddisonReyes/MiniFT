use crate::{
    email::ParsedEmail,
    parsers::{parse_with_bank_name, BankEmailParser, ParsedTransaction},
};

pub struct QikParser;

impl BankEmailParser for QikParser {
    fn bank_name(&self) -> &'static str {
        "Qik"
    }

    fn can_parse(&self, sender: &str, subject: &str) -> bool {
        let text = format!("{sender} {subject}").to_ascii_lowercase();
        text.contains("qik")
    }

    fn parse(&self, email: ParsedEmail) -> Result<ParsedTransaction, String> {
        parse_with_bank_name(email)
    }
}
