use crate::{
    email::ParsedEmail,
    parsers::{parse_with_bank_name, BankEmailParser, ParsedTransaction},
};

pub struct SantaCruzParser;

impl BankEmailParser for SantaCruzParser {
    fn bank_name(&self) -> &'static str {
        "Santa Cruz"
    }

    fn can_parse(&self, sender: &str, subject: &str) -> bool {
        let text = format!("{sender} {subject}").to_ascii_lowercase();
        text.contains("santa cruz") || text.contains("santacruz")
    }

    fn parse(&self, email: ParsedEmail) -> Result<ParsedTransaction, String> {
        parse_with_bank_name(email)
    }
}
