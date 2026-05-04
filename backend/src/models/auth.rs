use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow)]
pub struct UserRecord {
    pub id: Uuid,
    pub email: String,
    pub password_hash: String,
    pub currency: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct UserProfile {
    pub id: Uuid,
    pub email: String,
    pub currency: String,
    pub created_at: DateTime<Utc>,
}

impl From<&UserRecord> for UserProfile {
    fn from(value: &UserRecord) -> Self {
        Self {
            id: value.id,
            email: value.email.clone(),
            currency: value.currency.clone(),
            created_at: value.created_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TokenKind {
    Access,
    Refresh,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenClaims {
    pub sub: Uuid,
    pub email: String,
    pub token_kind: TokenKind,
    pub exp: usize,
    pub iat: usize,
}

#[derive(Debug, Clone, FromRow)]
pub struct RefreshSessionRecord {
    pub id: Uuid,
    pub user_id: Uuid,
    pub token_hash: String,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub revoked_at: Option<DateTime<Utc>>,
    pub replaced_by_session_id: Option<Uuid>,
}
