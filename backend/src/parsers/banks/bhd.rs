use crate::{
    email::ParsedEmail,
    parsers::{parse_with_bank_name, BankEmailParser, ParsedTransaction},
};

pub struct BhdParser;

impl BankEmailParser for BhdParser {
    fn bank_name(&self) -> &'static str {
        "BHD"
    }

    fn can_parse(&self, sender: &str, subject: &str) -> bool {
        let text = format!("{sender} {subject}").to_ascii_lowercase();
        text.contains("bhd")
    }

    fn parse(&self, email: ParsedEmail) -> Result<ParsedTransaction, String> {
        parse_with_bank_name(email)
    }
}
