use std::time::Duration;

use reqwest::Client;
use serde::Deserialize;

const TURNSTILE_VERIFY_URL: &str = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

#[derive(Debug, Deserialize)]
struct TurnstileVerifyResponse {
    success: bool,
    #[serde(default, rename = "error-codes")]
    error_codes: Vec<String>,
}

#[derive(Debug, PartialEq, Eq)]
pub enum TurnstileError {
    MissingSecret,
    MissingToken,
    Rejected { error_codes: Vec<String> },
    RequestFailed,
    InvalidResponse,
}

#[rocket::async_trait]
pub trait TurnstileVerifier: Send + Sync {
    async fn verify_token(&self, secret_key: &str, token: &str) -> Result<(), TurnstileError>;
}

#[derive(Debug, Clone)]
pub struct CloudflareTurnstileVerifier {
    client: Client,
}

impl CloudflareTurnstileVerifier {
    pub fn new() -> Result<Self, TurnstileError> {
        Ok(Self {
            client: build_http_client()?,
        })
    }
}

#[rocket::async_trait]
impl TurnstileVerifier for CloudflareTurnstileVerifier {
    async fn verify_token(&self, secret_key: &str, token: &str) -> Result<(), TurnstileError> {
        verify_turnstile_token_with_client(&self.client, secret_key, token).await
    }
}

fn build_http_client() -> Result<Client, TurnstileError> {
    Client::builder()
        .timeout(Duration::from_secs(10))
        .build()
        .map_err(|_| TurnstileError::RequestFailed)
}

async fn verify_turnstile_token_with_client(
    client: &Client,
    secret_key: &str,
    token: &str,
) -> Result<(), TurnstileError> {
    let secret_key = secret_key.trim();
    let token = token.trim();

    if token.is_empty() {
        return Err(TurnstileError::MissingToken);
    }

    if secret_key.is_empty() {
        return Err(TurnstileError::MissingSecret);
    }

    let response = client
        .post(TURNSTILE_VERIFY_URL)
        .form(&[("secret", secret_key), ("response", token)])
        .send()
        .await
        .map_err(|_| TurnstileError::RequestFailed)?;

    if !response.status().is_success() {
        return Err(TurnstileError::RequestFailed);
    }

    let verification = response
        .json::<TurnstileVerifyResponse>()
        .await
        .map_err(|_| TurnstileError::InvalidResponse)?;

    if verification.success {
        return Ok(());
    }

    Err(TurnstileError::Rejected {
        error_codes: verification.error_codes,
    })
}

pub async fn verify_turnstile_token(secret_key: &str, token: &str) -> Result<(), TurnstileError> {
    let client = build_http_client()?;
    verify_turnstile_token_with_client(&client, secret_key, token).await
}

#[cfg(test)]
mod tests {
    use super::{verify_turnstile_token, TurnstileError};

    #[tokio::test]
    async fn rejects_missing_token_before_http_request() {
        let error = verify_turnstile_token("secret", "")
            .await
            .expect_err("empty token should fail");

        assert_eq!(error, TurnstileError::MissingToken);
    }

    #[tokio::test]
    async fn rejects_missing_secret_before_http_request() {
        let error = verify_turnstile_token("", "token")
            .await
            .expect_err("empty secret should fail");

        assert_eq!(error, TurnstileError::MissingSecret);
    }
}
