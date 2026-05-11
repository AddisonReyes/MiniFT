use chrono::{DateTime, Utc};
use rocket::form::FromFormField;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::{FromRow, Type};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::models::{account::AccountType, transaction::TransactionType};

#[derive(
    Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type, FromFormField, ToSchema,
)]
#[serde(rename_all = "snake_case")]
#[sqlx(type_name = "email_import_status", rename_all = "snake_case")]
pub enum EmailImportStatus {
    #[field(value = "pending_review")]
    PendingReview,
    #[field(value = "imported")]
    Imported,
    #[field(value = "failed")]
    Failed,
    #[field(value = "ignored")]
    Ignored,
}

#[derive(Debug, Clone, FromRow)]
pub struct GmailConnectionRecord {
    pub id: Uuid,
    pub user_id: Uuid,
    pub google_email: String,
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: DateTime<Utc>,
    pub scopes: String,
    pub sync_enabled: bool,
    pub auto_approve_ready_imports: bool,
    pub gmail_history_id: Option<i64>,
    pub sync_in_progress: bool,
    pub last_sync_started_at: Option<DateTime<Utc>>,
    pub last_synced_at: Option<DateTime<Utc>>,
    pub last_error: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow)]
pub struct GmailConnectionStatusRow {
    pub id: Uuid,
    pub google_email: String,
    pub scopes: String,
    pub sync_enabled: bool,
    pub auto_approve_ready_imports: bool,
    pub sync_in_progress: bool,
    pub last_sync_started_at: Option<DateTime<Utc>>,
    pub last_synced_at: Option<DateTime<Utc>>,
    pub last_error: Option<String>,
    pub imported_count: i64,
    pub pending_review_count: i64,
    pub ready_count: i64,
    pub failed_count: i64,
}

#[derive(Debug, Clone, FromRow)]
pub struct BankEmailPatternRecord {
    pub id: Uuid,
    pub bank_name: String,
    pub sender_pattern: String,
    pub subject_pattern: String,
    pub amount_regex: String,
    pub merchant_regex: Option<String>,
    pub date_regex: Option<String>,
    pub card_regex: Option<String>,
    pub transaction_type: TransactionType,
    pub active: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow)]
pub struct BankAccountMappingRecord {
    pub id: Uuid,
    pub user_id: Uuid,
    pub bank_name: String,
    pub card_last4: String,
    pub minift_account_id: Uuid,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow)]
pub struct EmailTransactionImportRecord {
    pub id: Uuid,
    pub user_id: Uuid,
    pub gmail_message_id: String,
    pub gmail_thread_id: Option<String>,
    pub bank_name: String,
    pub sender_email: String,
    pub email_subject: String,
    pub email_date: DateTime<Utc>,
    pub parsed_successfully: bool,
    pub parsing_error: Option<String>,
    pub raw_email_snippet: Option<String>,
    pub parsed_transaction: Option<Value>,
    pub transaction_hash: Option<String>,
    pub status: EmailImportStatus,
    pub matched_account_id: Option<Uuid>,
    pub suggested_category: Option<String>,
    pub confidence_score: i32,
    pub ready_to_approve: bool,
    pub auto_approved: bool,
    pub account_match_reason: Option<String>,
    pub category_match_reason: Option<String>,
    pub created_transaction_id: Option<Uuid>,
    pub sync_attempt_count: i32,
    pub reviewed_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow)]
pub struct EmailTransactionImportRow {
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
    pub parsed_transaction: Option<Value>,
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

#[derive(Debug, Clone, FromRow)]
pub struct MerchantAliasRuleRecord {
    pub id: Uuid,
    pub user_id: Uuid,
    pub source_merchant_key: String,
    pub source_merchant_label: String,
    pub normalized_merchant: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow)]
pub struct MerchantCategoryRuleRecord {
    pub id: Uuid,
    pub user_id: Uuid,
    pub merchant_key: String,
    pub merchant_name: String,
    pub transaction_type: TransactionType,
    pub category: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow)]
pub struct BankDefaultAccountRecord {
    pub id: Uuid,
    pub user_id: Uuid,
    pub bank_name: String,
    pub currency: String,
    pub minift_account_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, FromRow)]
pub struct AccountAutomationCandidateRow {
    pub id: Uuid,
    pub name: String,
    pub r#type: AccountType,
    pub currency: String,
    pub created_at: DateTime<Utc>,
}
