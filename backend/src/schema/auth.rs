use serde::{Deserialize, Serialize};
#[allow(unused_imports)]
use serde_json::json;
use utoipa::ToSchema;

use crate::models::auth::UserProfile;

#[derive(Debug, Deserialize, ToSchema)]
#[schema(example = json!({
    "email": "alex@example.com",
    "password": "StrongPass123",
    "currency": "USD"
}))]
pub struct RegisterRequest {
    /// Unique email address for the new account.
    #[schema(format = Email, example = "alex@example.com")]
    pub email: String,
    /// Plain-text password with a minimum length of 8 characters.
    #[schema(min_length = 8, write_only, example = "StrongPass123")]
    pub password: String,
    /// Optional default ISO 4217 currency code. Defaults to `USD`.
    #[schema(pattern = "^[A-Za-z]{3}$", example = "USD")]
    pub currency: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
#[schema(example = json!({
    "message": "Account created. Check your email to verify it.",
    "email": "alex@example.com"
}))]
pub struct RegistrationResponse {
    /// Human-readable status for the pending verification step.
    #[schema(example = "Account created. Check your email to verify it.")]
    pub message: String,
    /// Email address where the verification link was sent.
    #[schema(format = Email, example = "alex@example.com")]
    pub email: String,
}

#[derive(Debug, Deserialize, ToSchema)]
#[schema(example = json!({
    "email": "alex@example.com",
    "password": "StrongPass123"
}))]
pub struct LoginRequest {
    /// Registered email address.
    #[schema(format = Email, example = "alex@example.com")]
    pub email: String,
    /// Plain-text password.
    #[schema(min_length = 8, write_only, example = "StrongPass123")]
    pub password: String,
}

#[derive(Debug, Deserialize, ToSchema)]
#[schema(example = json!({
    "email": "alex@example.com"
}))]
pub struct ResendVerificationRequest {
    /// Email address that should receive a fresh verification link.
    #[schema(format = Email, example = "alex@example.com")]
    pub email: String,
}

#[derive(Debug, Deserialize, ToSchema)]
#[schema(example = json!({
    "token": "7f3b0daa-1a48-4e6e-8f4d-d89f5f8f5001.58d6a9ef4a3141d9b2a9f2709b7a6fb9"
}))]
pub struct VerifyEmailRequest {
    /// Verification token copied from the email link.
    #[schema(example = "7f3b0daa-1a48-4e6e-8f4d-d89f5f8f5001.58d6a9ef4a3141d9b2a9f2709b7a6fb9")]
    pub token: String,
}

#[derive(Debug, Deserialize, ToSchema)]
#[schema(example = json!({
    "email": "alex@example.com"
}))]
pub struct PasswordResetRequest {
    /// Account email that should receive the password reset code.
    #[schema(format = Email, example = "alex@example.com")]
    pub email: String,
}

#[derive(Debug, Deserialize, ToSchema)]
#[schema(example = json!({
    "email": "alex@example.com",
    "code": "418207",
    "password": "NewStrongPass123",
    "password_confirmation": "NewStrongPass123"
}))]
pub struct ConfirmPasswordResetRequest {
    /// Registered email address receiving the reset code.
    #[schema(format = Email, example = "alex@example.com")]
    pub email: String,
    /// One-time code delivered by email.
    #[schema(example = "418207")]
    pub code: String,
    /// New plain-text password with a minimum length of 8 characters.
    #[schema(min_length = 8, write_only, example = "NewStrongPass123")]
    pub password: String,
    /// Confirmation value that must match `password`.
    #[schema(min_length = 8, write_only, example = "NewStrongPass123")]
    pub password_confirmation: String,
}

#[derive(Debug, Deserialize, ToSchema)]
#[schema(example = json!({
    "code": "418207",
    "password": "NewStrongPass123",
    "password_confirmation": "NewStrongPass123"
}))]
pub struct ConfirmPasswordChangeRequest {
    /// One-time code delivered by email.
    #[schema(example = "418207")]
    pub code: String,
    /// New plain-text password with a minimum length of 8 characters.
    #[schema(min_length = 8, write_only, example = "NewStrongPass123")]
    pub password: String,
    /// Confirmation value that must match `password`.
    #[schema(min_length = 8, write_only, example = "NewStrongPass123")]
    pub password_confirmation: String,
}

#[derive(Debug, Deserialize, ToSchema)]
#[schema(example = json!({
    "currency": "DOP"
}))]
pub struct UpdateDefaultCurrencyRequest {
    /// New default ISO 4217 currency code for the user profile.
    #[schema(pattern = "^[A-Za-z]{3}$", example = "DOP")]
    pub currency: String,
}

#[derive(Debug, Serialize, ToSchema)]
#[schema(example = json!({
    "user": {
        "id": "7f3b0daa-1a48-4e6e-8f4d-d89f5f8f5001",
        "email": "alex@example.com",
        "currency": "USD",
        "created_at": "2026-05-01T10:15:30Z"
    }
}))]
pub struct AuthResponse {
    /// Current user profile returned after the session cookies are issued or rotated.
    pub user: UserProfile,
}
