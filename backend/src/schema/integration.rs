use chrono::{DateTime, Utc};
use serde::Serialize;
#[allow(unused_imports)]
use serde_json::json;
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Serialize, ToSchema)]
#[schema(example = json!({
    "configured": true,
    "connected": true,
    "connection_id": "7be3c133-4c46-4f4f-bb49-95d9a09cdc0a",
    "google_email": "user@gmail.com",
    "sync_enabled": true,
    "sync_in_progress": false,
    "scopes": ["https://www.googleapis.com/auth/gmail.readonly"],
    "last_sync_started_at": "2026-05-10T13:00:00Z",
    "last_synced_at": "2026-05-10T13:00:08Z",
    "last_error": null,
    "imported_count": 24,
    "pending_review_count": 2,
    "failed_count": 1,
    "connect_url": "/api/integrations/google/connect"
}))]
pub struct GmailIntegrationStatusResponse {
    pub configured: bool,
    pub connected: bool,
    pub connection_id: Option<Uuid>,
    pub google_email: Option<String>,
    pub sync_enabled: bool,
    pub sync_in_progress: bool,
    pub scopes: Vec<String>,
    pub last_sync_started_at: Option<DateTime<Utc>>,
    pub last_synced_at: Option<DateTime<Utc>>,
    pub last_error: Option<String>,
    pub imported_count: i64,
    pub pending_review_count: i64,
    pub failed_count: i64,
    pub connect_url: Option<String>,
}
