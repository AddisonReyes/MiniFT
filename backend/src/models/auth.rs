use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
#[allow(unused_imports)]
use serde_json::json;
use sqlx::{FromRow, Type};
use utoipa::ToSchema;
use uuid::Uuid;

#[derive(Debug, Clone, FromRow)]
pub struct UserRecord {
    pub id: Uuid,
    pub email: String,
    pub password_hash: String,
    pub currency: String,
    pub created_at: DateTime<Utc>,
    pub email_verified_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
#[schema(example = json!({
    "id": "7f3b0daa-1a48-4e6e-8f4d-d89f5f8f5001",
    "email": "alex@example.com",
    "currency": "USD",
    "created_at": "2026-05-01T10:15:30Z",
    "email_verified_at": "2026-05-01T10:20:00Z"
}))]
pub struct UserProfile {
    /// Stable unique identifier for the signed-in user.
    #[schema(example = "7f3b0daa-1a48-4e6e-8f4d-d89f5f8f5001")]
    pub id: Uuid,
    /// Unique email address used for authentication.
    #[schema(format = Email, example = "alex@example.com")]
    pub email: String,
    /// Default ISO 4217 currency code for the workspace.
    #[schema(pattern = "^[A-Za-z]{3}$", example = "USD")]
    pub currency: String,
    /// Timestamp when the user account was created.
    #[schema(example = "2026-05-01T10:15:30Z")]
    pub created_at: DateTime<Utc>,
    /// Timestamp when the email address was verified. `null` means the account is still pending verification.
    #[schema(example = "2026-05-01T10:20:00Z", nullable = true)]
    pub email_verified_at: Option<DateTime<Utc>>,
}

impl From<&UserRecord> for UserProfile {
    fn from(value: &UserRecord) -> Self {
        Self {
            id: value.id,
            email: value.email.clone(),
            currency: value.currency.clone(),
            created_at: value.created_at,
            email_verified_at: value.email_verified_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum TokenKind {
    Access,
    Refresh,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "snake_case")]
#[sqlx(type_name = "email_challenge_purpose", rename_all = "snake_case")]
pub enum EmailChallengePurpose {
    VerifyEmail,
    PasswordReset,
    PasswordChange,
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

#[derive(Debug, Clone, FromRow)]
pub struct EmailChallengeRecord {
    pub id: Uuid,
    pub user_id: Uuid,
    pub purpose: EmailChallengePurpose,
    pub secret_hash: String,
    pub expires_at: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
    pub used_at: Option<DateTime<Utc>>,
    pub revoked_at: Option<DateTime<Utc>>,
    pub failed_attempts: i32,
    pub max_attempts: i32,
}
