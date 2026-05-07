use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateTransferRequest {
    /// Source account id.
    pub from_account_id: Uuid,
    /// Destination account id.
    pub to_account_id: Uuid,
    /// Positive amount debited from the source account.
    pub amount: Decimal,
    /// Transfer date in `YYYY-MM-DD` format.
    pub date: NaiveDate,
    /// Optional free-form note reused by the mirrored entries.
    pub note: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct TransferResponse {
    /// Stable unique identifier for the transfer.
    pub id: Uuid,
    /// Source account id.
    pub from_account_id: Uuid,
    /// Destination account id.
    pub to_account_id: Uuid,
    /// Source account display name.
    pub from_account_name: String,
    /// Destination account display name.
    pub to_account_name: String,
    /// Amount debited from the source account.
    pub amount: Decimal,
    /// Transfer date in `YYYY-MM-DD` format.
    pub date: NaiveDate,
    /// Optional free-form note.
    pub note: Option<String>,
    /// Timestamp when the transfer was created.
    pub created_at: DateTime<Utc>,
}
