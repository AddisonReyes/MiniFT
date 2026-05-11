use crate::{
    email::ParsedEmail,
    parsers::{parse_with_bank_name, BankEmailParser, ParsedTransaction},
};

pub struct ScotiabankRdParser;

impl BankEmailParser for ScotiabankRdParser {
    fn bank_name(&self) -> &'static str {
        "Scotiabank RD"
    }

    fn can_parse(&self, sender: &str, subject: &str) -> bool {
        format!("{sender} {subject}")
            .to_ascii_lowercase()
            .contains("scotiabank")
    }

    fn parse(&self, email: ParsedEmail) -> Result<ParsedTransaction, String> {
        parse_with_bank_name(email)
    }
}
