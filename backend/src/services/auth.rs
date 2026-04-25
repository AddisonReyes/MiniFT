use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use chrono::{Duration, Utc};
use jsonwebtoken::{encode, EncodingKey, Header};
use sqlx::{types::Uuid, PgPool};

use crate::{
    config::AuthConfig,
    errors::ApiError,
    models::{
        account::AccountType,
        auth::{TokenClaims, TokenKind, UserProfile, UserRecord},
    },
    schema::auth::{AuthResponse, LoginRequest, RefreshRequest, RegisterRequest},
};

fn normalize_email(email: &str) -> Result<String, ApiError> {
    let email = email.trim().to_lowercase();

    if email.is_empty() || !email.contains('@') {
        return Err(ApiError::bad_request("A valid email address is required"));
    }

    Ok(email)
}

fn validate_password(password: &str) -> Result<(), ApiError> {
    if password.len() < 8 {
        return Err(ApiError::bad_request(
            "Password must be at least 8 characters long",
        ));
    }

    Ok(())
}

fn hash_password(password: &str) -> Result<String, ApiError> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|error| ApiError::internal(error.to_string()))
}

fn verify_password(password: &str, hash: &str) -> Result<(), ApiError> {
    let parsed_hash =
        PasswordHash::new(hash).map_err(|_| ApiError::unauthorized("Invalid credentials"))?;

    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .map_err(|_| ApiError::unauthorized("Invalid credentials"))
}

fn encode_token(
    user: &UserRecord,
    auth: &AuthConfig,
    token_kind: TokenKind,
    ttl: Duration,
) -> Result<String, ApiError> {
    let issued_at = Utc::now();
    let expires_at = issued_at + ttl;
    let claims = TokenClaims {
        sub: user.id,
        email: user.email.clone(),
        token_kind,
        exp: expires_at.timestamp() as usize,
        iat: issued_at.timestamp() as usize,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(auth.jwt_secret.as_bytes()),
    )
    .map_err(|error| ApiError::internal(error.to_string()))
}

fn issue_auth_response(user: &UserRecord, auth: &AuthConfig) -> Result<AuthResponse, ApiError> {
    let access_token = encode_token(
        user,
        auth,
        TokenKind::Access,
        Duration::minutes(auth.access_token_ttl_minutes),
    )?;
    let refresh_token = encode_token(
        user,
        auth,
        TokenKind::Refresh,
        Duration::days(auth.refresh_token_ttl_days),
    )?;

    Ok(AuthResponse {
        user: UserProfile::from(user),
        access_token,
        refresh_token,
    })
}

fn is_unique_violation(error: &sqlx::Error) -> bool {
    match error {
        sqlx::Error::Database(db_error) => db_error.code().as_deref() == Some("23505"),
        _ => false,
    }
}

pub async fn register_user(
    pool: &PgPool,
    auth: &AuthConfig,
    payload: RegisterRequest,
) -> Result<AuthResponse, ApiError> {
    let email = normalize_email(&payload.email)?;
    validate_password(&payload.password)?;
    let currency = payload
        .currency
        .unwrap_or_else(|| "USD".to_string())
        .trim()
        .to_uppercase();

    if currency.is_empty() {
        return Err(ApiError::bad_request("Currency is required"));
    }

    let password_hash = hash_password(&payload.password)?;
    let mut transaction = pool.begin().await?;

    let user = sqlx::query_as::<_, UserRecord>(
        "INSERT INTO users (email, password_hash, currency)
         VALUES ($1, $2, $3)
         RETURNING id, email, password_hash, currency, created_at",
    )
    .bind(email)
    .bind(password_hash)
    .bind(currency)
    .fetch_one(&mut *transaction)
    .await
    .map_err(|error| {
        if is_unique_violation(&error) {
            ApiError::conflict("Email is already registered")
        } else {
            ApiError::from(error)
        }
    })?;

    sqlx::query(
        "INSERT INTO accounts (user_id, name, type)
         VALUES ($1, 'Cash', $2)",
    )
    .bind(user.id)
    .bind(AccountType::Cash)
    .execute(&mut *transaction)
    .await?;

    transaction.commit().await?;

    issue_auth_response(&user, auth)
}

pub async fn login_user(
    pool: &PgPool,
    auth: &AuthConfig,
    payload: LoginRequest,
) -> Result<AuthResponse, ApiError> {
    let email = normalize_email(&payload.email)?;

    let user = sqlx::query_as::<_, UserRecord>(
        "SELECT id, email, password_hash, currency, created_at
         FROM users
         WHERE email = $1",
    )
    .bind(email)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| ApiError::unauthorized("Invalid credentials"))?;

    verify_password(&payload.password, &user.password_hash)?;

    issue_auth_response(&user, auth)
}

pub async fn refresh_session(
    pool: &PgPool,
    auth: &AuthConfig,
    payload: RefreshRequest,
) -> Result<AuthResponse, ApiError> {
    let token = payload
        .refresh_token
        .ok_or_else(|| ApiError::bad_request("Refresh token is required"))?;

    let claims = jsonwebtoken::decode::<TokenClaims>(
        &token,
        &jsonwebtoken::DecodingKey::from_secret(auth.jwt_secret.as_bytes()),
        &jsonwebtoken::Validation::default(),
    )
    .map_err(|_| ApiError::unauthorized("Invalid or expired refresh token"))?
    .claims;

    if claims.token_kind != TokenKind::Refresh {
        return Err(ApiError::unauthorized("Refresh token required"));
    }

    let user = sqlx::query_as::<_, UserRecord>(
        "SELECT id, email, password_hash, currency, created_at
         FROM users
         WHERE id = $1",
    )
    .bind(claims.sub)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| ApiError::unauthorized("User not found"))?;

    issue_auth_response(&user, auth)
}

pub async fn get_user_profile(pool: &PgPool, user_id: Uuid) -> Result<UserProfile, ApiError> {
    let user = sqlx::query_as::<_, UserRecord>(
        "SELECT id, email, password_hash, currency, created_at
         FROM users
         WHERE id = $1",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| ApiError::not_found("User not found"))?;

    Ok(UserProfile::from(&user))
}
