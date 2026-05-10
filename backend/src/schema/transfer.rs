use chrono::{DateTime, NaiveDate, Utc};
use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
#[allow(unused_imports)]
use serde_json::json;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Deserialize, ToSchema)]
#[schema(example = json!({
    "from_account_id": "d5dcbe8d-bb41-49c4-939f-9adf5a8c6001",
    "to_account_id": "1ad96c9d-0bbd-46b7-b037-b2b922908001",
    "amount": "300.00",
    "date": "2026-05-04",
    "note": "Move money to savings"
}))]
pub struct CreateTransferRequest {
    /// Source account id.
    #[schema(example = "d5dcbe8d-bb41-49c4-939f-9adf5a8c6001")]
    pub from_account_id: Uuid,
    /// Destination account id.
    #[schema(example = "1ad96c9d-0bbd-46b7-b037-b2b922908001")]
    pub to_account_id: Uuid,
    /// Positive amount debited from the source account.
    #[schema(example = "300.00")]
    pub amount: Decimal,
    /// Transfer date in `YYYY-MM-DD` format.
    #[schema(example = "2026-05-04")]
    pub date: NaiveDate,
    /// Optional free-form note reused by the mirrored entries.
    #[schema(max_length = 128, example = "Move money to savings")]
    pub note: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
#[schema(example = json!({
    "id": "a7ac0a95-f5e2-45b9-9f07-4717f6c98001",
    "from_account_id": "d5dcbe8d-bb41-49c4-939f-9adf5a8c6001",
    "to_account_id": "1ad96c9d-0bbd-46b7-b037-b2b922908001",
    "from_account_name": "Primary checking",
    "to_account_name": "Emergency savings",
    "amount": "300.00",
    "date": "2026-05-04",
    "note": "Move money to savings",
    "created_at": "2026-05-04T08:45:00Z"
}))]
pub struct TransferResponse {
    /// Stable unique identifier for the transfer.
    #[schema(example = "a7ac0a95-f5e2-45b9-9f07-4717f6c98001")]
    pub id: Uuid,
    /// Source account id.
    #[schema(example = "d5dcbe8d-bb41-49c4-939f-9adf5a8c6001")]
    pub from_account_id: Uuid,
    /// Destination account id.
    #[schema(example = "1ad96c9d-0bbd-46b7-b037-b2b922908001")]
    pub to_account_id: Uuid,
    /// Source account display name.
    #[schema(example = "Primary checking")]
    pub from_account_name: String,
    /// Destination account display name.
    #[schema(example = "Emergency savings")]
    pub to_account_name: String,
    /// Amount debited from the source account.
    #[schema(example = "300.00")]
    pub amount: Decimal,
    /// Transfer date in `YYYY-MM-DD` format.
    #[schema(example = "2026-05-04")]
    pub date: NaiveDate,
    /// Optional free-form note.
    #[schema(example = "Move money to savings")]
    pub note: Option<String>,
    /// Timestamp when the transfer was created.
    #[schema(example = "2026-05-04T08:45:00Z")]
    pub created_at: DateTime<Utc>,
}
