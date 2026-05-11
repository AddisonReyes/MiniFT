use chrono::{DateTime, Utc};
use rocket::form::FromForm;
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
#[allow(unused_imports)]
use serde_json::json;
use utoipa::{IntoParams, ToSchema};
use uuid::Uuid;

use crate::{models::integration::EmailImportStatus, models::transaction::TransactionType};

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[schema(example = json!({
    "amount": "1250.00",
    "currency": "DOP",
    "merchant": "PriceSmart",
    "transaction_type": "expense",
    "account_hint": "Visa",
    "card_last4": "1234",
    "transaction_datetime": "2026-05-10T10:44:00Z"
}))]
pub struct ParsedTransactionPayload {
    pub amount: Decimal,
    pub currency: String,
    pub merchant: String,
    pub transaction_type: TransactionType,
    pub account_hint: Option<String>,
    pub card_last4: Option<String>,
    pub transaction_datetime: DateTime<Utc>,
}

#[derive(Debug, Clone, Default, FromForm, IntoParams)]
#[into_params(parameter_in = Query)]
pub struct ImportListQuery {
    #[param(example = "pending_review")]
    pub status: Option<EmailImportStatus>,
    #[param(example = 25, minimum = 1, maximum = 200)]
    pub limit: Option<u32>,
}

#[derive(Debug, Serialize, ToSchema)]
#[schema(example = json!({
    "id": "72340f46-c4bc-4582-98cc-c6d59732edc7",
    "gmail_message_id": "18fdb8b2d7bf2501",
    "gmail_thread_id": "18fdb8b2d7bf2500",
    "bank_name": "Banco Popular",
    "sender_email": "alertas@popularenlinea.com",
    "email_subject": "Consumo por RD$1,250.00 en PRICE SMART",
    "email_date": "2026-05-10T10:44:00Z",
    "parsed_successfully": true,
    "parsing_error": null,
    "raw_email_snippet": "Consumo por RD$1,250.00 en PRICE SMART...",
    "parsed_transaction": {
      "amount": "1250.00",
      "currency": "DOP",
      "merchant": "PriceSmart",
      "transaction_type": "expense",
      "account_hint": "Visa",
      "card_last4": "1234",
      "transaction_datetime": "2026-05-10T10:44:00Z"
    },
    "status": "pending_review",
    "matched_account_id": null,
    "matched_account_name": null,
    "suggested_category": "Groceries",
    "confidence_score": 82,
    "ready_to_approve": true,
    "auto_approved": false,
    "account_match_reason": "Matched your learned default Banco Popular DOP account",
    "category_match_reason": "Matched a learned category rule for PriceSmart",
    "created_transaction_id": null,
    "created_at": "2026-05-10T10:44:02Z"
}))]
pub struct EmailTransactionImportResponse {
    pub id: Uuid,
    pub gmail_message_id: String,
    pub gmail_thread_id: Option<String>,
    pub bank_name: String,
    pub sender_email: String,
    pub email_subject: String,
    pub email_date: DateTime<Utc>,
    pub parsed_successfully: bool,
    pub parsing_error: Option<String>,
    pub raw_email_snippet: Option<String>,
    pub parsed_transaction: Option<ParsedTransactionPayload>,
    pub status: EmailImportStatus,
    pub matched_account_id: Option<Uuid>,
    pub matched_account_name: Option<String>,
    pub suggested_category: Option<String>,
    pub confidence_score: i32,
    pub ready_to_approve: bool,
    pub auto_approved: bool,
    pub account_match_reason: Option<String>,
    pub category_match_reason: Option<String>,
    pub created_transaction_id: Option<Uuid>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize, ToSchema)]
#[schema(example = json!({
    "account_id": "d5dcbe8d-bb41-49c4-939f-9adf5a8c6001",
    "category": "Groceries",
    "merchant": "PriceSmart",
    "note": "Imported from Gmail",
    "create_mapping": true,
    "set_bank_default": true,
    "save_merchant_rule": true,
    "save_category_rule": true
}))]
pub struct ApproveImportRequest {
    pub account_id: Option<Uuid>,
    pub category: Option<String>,
    pub merchant: Option<String>,
    pub note: Option<String>,
    pub create_mapping: Option<bool>,
    pub set_bank_default: Option<bool>,
    pub save_merchant_rule: Option<bool>,
    pub save_category_rule: Option<bool>,
}

#[derive(Debug, Deserialize, ToSchema)]
#[schema(example = json!({
    "account_id": "d5dcbe8d-bb41-49c4-939f-9adf5a8c6001",
    "persist_mapping": true,
    "set_bank_default": true
}))]
pub struct LinkAccountRequest {
    pub account_id: Uuid,
    pub persist_mapping: Option<bool>,
    pub set_bank_default: Option<bool>,
}

#[derive(Debug, Deserialize, ToSchema)]
#[schema(example = json!({
    "reason": "Not a real transaction"
}))]
pub struct RejectImportRequest {
    pub reason: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
#[schema(example = json!({
    "approved_count": 3,
    "message": "Approved 3 ready imports"
}))]
pub struct ApproveReadyImportsResponse {
    pub approved_count: usize,
    pub message: String,
}
