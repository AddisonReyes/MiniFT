use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use chrono::{Duration, Utc};
use jsonwebtoken::{encode, EncodingKey, Header};
use sqlx::{PgPool, Postgres, Transaction};
use uuid::Uuid;

use crate::{
    config::AuthConfig,
    errors::ApiError,
    models::{
        account::AccountType,
        auth::{RefreshSessionRecord, TokenClaims, TokenKind, UserProfile, UserRecord},
    },
    schema::auth::{AuthResponse, LoginRequest, RegisterRequest, UpdateDefaultCurrencyRequest},
    services::normalize_currency_code,
};

pub struct IssuedAuthSession {
    pub user: UserProfile,
    pub access_token: String,
    pub refresh_token: String,
}

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

fn hash_secret(secret: &str) -> Result<String, ApiError> {
    let salt = SaltString::generate(&mut OsRng);
    Argon2::default()
        .hash_password(secret.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|_| ApiError::internal("Unable to securely process credentials"))
}

fn verify_secret(secret: &str, hash: &str, failure_message: &str) -> Result<(), ApiError> {
    let parsed_hash =
        PasswordHash::new(hash).map_err(|_| ApiError::unauthorized(failure_message))?;

    Argon2::default()
        .verify_password(secret.as_bytes(), &parsed_hash)
        .map_err(|_| ApiError::unauthorized(failure_message))
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
    .map_err(|_| ApiError::internal("Unable to issue authentication tokens"))
}

fn issue_session(
    user: &UserRecord,
    auth: &AuthConfig,
    refresh_token: String,
) -> Result<IssuedAuthSession, ApiError> {
    let access_token = encode_token(
        user,
        auth,
        TokenKind::Access,
        Duration::minutes(auth.access_token_ttl_minutes),
    )?;

    Ok(IssuedAuthSession {
        user: UserProfile::from(user),
        access_token,
        refresh_token,
    })
}

fn map_auth_response(session: &IssuedAuthSession) -> AuthResponse {
    AuthResponse {
        user: session.user.clone(),
    }
}

fn is_unique_violation(error: &sqlx::Error) -> bool {
    match error {
        sqlx::Error::Database(db_error) => db_error.code().as_deref() == Some("23505"),
        _ => false,
    }
}

fn invalid_refresh_token() -> ApiError {
    ApiError::unauthorized("Invalid or expired refresh token")
}

fn parse_refresh_token(raw_token: &str) -> Result<(Uuid, String), ApiError> {
    let (session_id, secret) = raw_token
        .split_once('.')
        .ok_or_else(invalid_refresh_token)?;
    let session_id = Uuid::parse_str(session_id).map_err(|_| invalid_refresh_token())?;

    if secret.trim().is_empty() {
        return Err(invalid_refresh_token());
    }

    Ok((session_id, secret.to_string()))
}

fn build_refresh_cookie_value(session_id: Uuid, secret: &str) -> String {
    format!("{session_id}.{secret}")
}

fn create_refresh_secret() -> String {
    SaltString::generate(&mut OsRng).to_string()
}

async fn find_user_by_email(pool: &PgPool, email: &str) -> Result<Option<UserRecord>, ApiError> {
    sqlx::query_as::<_, UserRecord>(
        "SELECT id, email, password_hash, currency, created_at
         FROM users
         WHERE email = $1",
    )
    .bind(email)
    .fetch_optional(pool)
    .await
    .map_err(ApiError::from)
}

async fn find_user_by_id(pool: &PgPool, user_id: Uuid) -> Result<Option<UserRecord>, ApiError> {
    sqlx::query_as::<_, UserRecord>(
        "SELECT id, email, password_hash, currency, created_at
         FROM users
         WHERE id = $1",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await
    .map_err(ApiError::from)
}

async fn find_user_by_id_in_transaction(
    transaction: &mut Transaction<'_, Postgres>,
    user_id: Uuid,
) -> Result<Option<UserRecord>, ApiError> {
    sqlx::query_as::<_, UserRecord>(
        "SELECT id, email, password_hash, currency, created_at
         FROM users
         WHERE id = $1",
    )
    .bind(user_id)
    .fetch_optional(&mut **transaction)
    .await
    .map_err(ApiError::from)
}

async fn find_refresh_session_for_update(
    transaction: &mut Transaction<'_, Postgres>,
    session_id: Uuid,
) -> Result<Option<RefreshSessionRecord>, ApiError> {
    sqlx::query_as::<_, RefreshSessionRecord>(
        "SELECT id, user_id, token_hash, expires_at, created_at, revoked_at, replaced_by_session_id
         FROM refresh_sessions
         WHERE id = $1
         FOR UPDATE",
    )
    .bind(session_id)
    .fetch_optional(&mut **transaction)
    .await
    .map_err(ApiError::from)
}

async fn insert_refresh_session(
    transaction: &mut Transaction<'_, Postgres>,
    user_id: Uuid,
    auth: &AuthConfig,
) -> Result<(Uuid, String), ApiError> {
    let session_id = Uuid::new_v4();
    let secret = create_refresh_secret();
    let token_hash = hash_secret(&secret)?;
    let expires_at = Utc::now() + Duration::days(auth.refresh_token_ttl_days);

    sqlx::query(
        "INSERT INTO refresh_sessions (id, user_id, token_hash, expires_at)
         VALUES ($1, $2, $3, $4)",
    )
    .bind(session_id)
    .bind(user_id)
    .bind(token_hash)
    .bind(expires_at)
    .execute(&mut **transaction)
    .await?;

    Ok((session_id, build_refresh_cookie_value(session_id, &secret)))
}

async fn create_refresh_session(
    pool: &PgPool,
    user_id: Uuid,
    auth: &AuthConfig,
) -> Result<String, ApiError> {
    let mut transaction = pool.begin().await?;
    let (_, refresh_token) = insert_refresh_session(&mut transaction, user_id, auth).await?;
    transaction.commit().await?;
    Ok(refresh_token)
}

async fn revoke_refresh_session(
    transaction: &mut Transaction<'_, Postgres>,
    session_id: Uuid,
    replaced_by_session_id: Option<Uuid>,
) -> Result<(), ApiError> {
    sqlx::query(
        "UPDATE refresh_sessions
         SET revoked_at = COALESCE(revoked_at, NOW()),
             replaced_by_session_id = COALESCE(replaced_by_session_id, $2)
         WHERE id = $1",
    )
    .bind(session_id)
    .bind(replaced_by_session_id)
    .execute(&mut **transaction)
    .await?;

    Ok(())
}

async fn issue_auth_session(
    pool: &PgPool,
    auth: &AuthConfig,
    user: &UserRecord,
) -> Result<IssuedAuthSession, ApiError> {
    let refresh_token = create_refresh_session(pool, user.id, auth).await?;
    issue_session(user, auth, refresh_token)
}

pub async fn register_user(
    pool: &PgPool,
    auth: &AuthConfig,
    payload: RegisterRequest,
) -> Result<IssuedAuthSession, ApiError> {
    let email = normalize_email(&payload.email)?;
    validate_password(&payload.password)?;
    let currency = normalize_currency_code(
        payload.currency.as_deref().unwrap_or("USD"),
        "Default currency",
    )?;

    let password_hash = hash_secret(&payload.password)?;
    let mut transaction = pool.begin().await?;

    let user = sqlx::query_as::<_, UserRecord>(
        "INSERT INTO users (email, password_hash, currency)
         VALUES ($1, $2, $3)
         RETURNING id, email, password_hash, currency, created_at",
    )
    .bind(email)
    .bind(password_hash)
    .bind(&currency)
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
        "INSERT INTO accounts (user_id, name, type, currency)
         VALUES ($1, 'Cash', $2, $3)",
    )
    .bind(user.id)
    .bind(AccountType::Cash)
    .bind(&currency)
    .execute(&mut *transaction)
    .await?;

    transaction.commit().await?;

    issue_auth_session(pool, auth, &user).await
}

pub async fn login_user(
    pool: &PgPool,
    auth: &AuthConfig,
    payload: LoginRequest,
) -> Result<IssuedAuthSession, ApiError> {
    let email = normalize_email(&payload.email)?;

    let user = find_user_by_email(pool, &email)
        .await?
        .ok_or_else(|| ApiError::unauthorized("Invalid credentials"))?;

    verify_secret(
        &payload.password,
        &user.password_hash,
        "Invalid credentials",
    )?;

    issue_auth_session(pool, auth, &user).await
}

pub async fn refresh_session(
    pool: &PgPool,
    auth: &AuthConfig,
    refresh_token: &str,
) -> Result<IssuedAuthSession, ApiError> {
    let (session_id, secret) = parse_refresh_token(refresh_token)?;
    let mut transaction = pool.begin().await?;
    let session = find_refresh_session_for_update(&mut transaction, session_id)
        .await?
        .ok_or_else(invalid_refresh_token)?;

    if session.revoked_at.is_some() || session.expires_at <= Utc::now() {
        revoke_refresh_session(&mut transaction, session.id, None).await?;
        transaction.commit().await?;
        return Err(invalid_refresh_token());
    }

    verify_secret(
        &secret,
        &session.token_hash,
        "Invalid or expired refresh token",
    )?;

    let user = find_user_by_id_in_transaction(&mut transaction, session.user_id)
        .await?
        .ok_or_else(|| ApiError::unauthorized("User not found"))?;

    let (replacement_session_id, replacement_token) =
        insert_refresh_session(&mut transaction, session.user_id, auth).await?;
    revoke_refresh_session(&mut transaction, session.id, Some(replacement_session_id)).await?;

    transaction.commit().await?;

    issue_session(&user, auth, replacement_token)
}

pub async fn logout_session(pool: &PgPool, refresh_token: Option<&str>) -> Result<(), ApiError> {
    let Some(refresh_token) = refresh_token else {
        return Ok(());
    };

    let Ok((session_id, _)) = parse_refresh_token(refresh_token) else {
        return Ok(());
    };

    let mut transaction = pool.begin().await?;

    if let Some(session) = find_refresh_session_for_update(&mut transaction, session_id).await? {
        revoke_refresh_session(&mut transaction, session.id, None).await?;
    }

    transaction.commit().await?;

    Ok(())
}

pub async fn get_user_profile(pool: &PgPool, user_id: Uuid) -> Result<UserProfile, ApiError> {
    let user = find_user_by_id(pool, user_id)
        .await?
        .ok_or_else(|| ApiError::not_found("User not found"))?;

    Ok(UserProfile::from(&user))
}

pub async fn update_default_currency(
    pool: &PgPool,
    user_id: Uuid,
    payload: UpdateDefaultCurrencyRequest,
) -> Result<UserProfile, ApiError> {
    let currency = normalize_currency_code(&payload.currency, "Default currency")?;

    let result = sqlx::query(
        "UPDATE users
         SET currency = $1
         WHERE id = $2",
    )
    .bind(currency)
    .bind(user_id)
    .execute(pool)
    .await?;

    if result.rows_affected() == 0 {
        return Err(ApiError::not_found("User not found"));
    }

    get_user_profile(pool, user_id).await
}

pub fn auth_response(session: &IssuedAuthSession) -> AuthResponse {
    map_auth_response(session)
}

#[cfg(test)]
mod tests {
    use uuid::Uuid;

    use super::{normalize_email, parse_refresh_token, validate_password};

    #[test]
    fn normalizes_email_by_trimming_and_lowercasing() {
        let email = normalize_email("  USER@Example.COM  ").expect("email should normalize");

        assert_eq!(email, "user@example.com");
    }

    #[test]
    fn rejects_invalid_email_without_separator() {
        let error = normalize_email("invalid-email").expect_err("email should fail");

        assert_eq!(error.message, "A valid email address is required");
    }

    #[test]
    fn validates_password_minimum_length() {
        let error = validate_password("short").expect_err("password should fail");

        assert_eq!(error.message, "Password must be at least 8 characters long");
    }

    #[test]
    fn parses_refresh_tokens_into_session_id_and_secret() {
        let session_id = Uuid::new_v4();
        let parsed = parse_refresh_token(&format!("{session_id}.secret-token"))
            .expect("refresh token should parse");

        assert_eq!(parsed.0, session_id);
        assert_eq!(parsed.1, "secret-token");
    }

    #[test]
    fn rejects_refresh_tokens_without_both_parts() {
        let error = parse_refresh_token("missing-secret").expect_err("token should fail");

        assert_eq!(error.message, "Invalid or expired refresh token");
    }
}
