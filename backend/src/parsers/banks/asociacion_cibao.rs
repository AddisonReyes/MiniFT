use crate::{
    email::ParsedEmail,
    parsers::{parse_with_bank_name, BankEmailParser, ParsedTransaction},
};

pub struct AsociacionCibaoParser;

impl BankEmailParser for AsociacionCibaoParser {
    fn bank_name(&self) -> &'static str {
        "Asociación Cibao"
    }

    fn can_parse(&self, sender: &str, subject: &str) -> bool {
        let text = format!("{sender} {subject}").to_ascii_lowercase();
        text.contains("cibao") || text.contains("acibao")
    }

    fn parse(&self, email: ParsedEmail) -> Result<ParsedTransaction, String> {
        parse_with_bank_name(email)
    }
}
