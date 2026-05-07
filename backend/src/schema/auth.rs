use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

use crate::models::auth::UserProfile;

#[derive(Debug, Deserialize, ToSchema)]
pub struct RegisterRequest {
    /// Unique email address for the new account.
    pub email: String,
    /// Plain-text password with a minimum length of 8 characters.
    pub password: String,
    /// Optional default ISO 4217 currency code. Defaults to `USD`.
    pub currency: Option<String>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct LoginRequest {
    /// Registered email address.
    pub email: String,
    /// Plain-text password.
    pub password: String,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateDefaultCurrencyRequest {
    /// New default ISO 4217 currency code for the user profile.
    pub currency: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct AuthResponse {
    /// Current user profile returned after the session cookies are issued or rotated.
    pub user: UserProfile,
}
