mod common;

use common::{test_auth_config, TestDatabase};
use minift_backend::{
    schema::auth::{
        ConfirmPasswordChangeRequest, ConfirmPasswordResetRequest, LoginRequest, RegisterRequest,
    },
    services::auth,
};
use rocket::http::Status;
use sqlx::Row;

#[tokio::test]
async fn email_verification_is_required_before_login() {
    let Some(database) = TestDatabase::new().await else {
        return;
    };

    let auth_config = test_auth_config();
    let registration = auth::register_user(
        &database.pool,
        24,
        RegisterRequest {
            email: "verify-flow@example.test".to_string(),
            password: "password123".to_string(),
            currency: Some("USD".to_string()),
        },
    )
    .await
    .expect("registration should succeed");

    let login_error = auth::login_user(
        &database.pool,
        &auth_config,
        LoginRequest {
            email: registration.user.email.clone(),
            password: "password123".to_string(),
        },
    )
    .await
    .expect_err("login should fail before email verification");

    assert_eq!(
        login_error.message,
        "Please verify your email before signing in"
    );

    let verified_session = auth::verify_email_token(
        &database.pool,
        &auth_config,
        &registration.verification_token,
    )
    .await
    .expect("verification should issue a session");

    assert_eq!(verified_session.user.email, registration.user.email);
    assert!(verified_session.user.email_verified_at.is_some());

    let login_session = auth::login_user(
        &database.pool,
        &auth_config,
        LoginRequest {
            email: registration.user.email.clone(),
            password: "password123".to_string(),
        },
    )
    .await
    .expect("login should succeed after verification");

    assert_eq!(login_session.user.email, registration.user.email);

    database.cleanup().await;
}

#[tokio::test]
async fn password_reset_updates_password_and_revokes_existing_refresh_sessions() {
    let Some(database) = TestDatabase::new().await else {
        return;
    };

    let auth_config = test_auth_config();
    let registration = auth::register_user(
        &database.pool,
        24,
        RegisterRequest {
            email: "reset-flow@example.test".to_string(),
            password: "password123".to_string(),
            currency: Some("USD".to_string()),
        },
    )
    .await
    .expect("registration should succeed");
    auth::mark_user_email_verified(&database.pool, registration.user.id)
        .await
        .expect("user should be marked verified");

    auth::login_user(
        &database.pool,
        &auth_config,
        LoginRequest {
            email: registration.user.email.clone(),
            password: "password123".to_string(),
        },
    )
    .await
    .expect("initial login should succeed");

    let active_sessions_before = sqlx::query(
        "SELECT COUNT(*) AS count
         FROM refresh_sessions
         WHERE user_id = $1
           AND revoked_at IS NULL",
    )
    .bind(registration.user.id)
    .fetch_one(&database.pool)
    .await
    .expect("session count")
    .get::<i64, _>("count");

    assert_eq!(active_sessions_before, 1);

    let delivery = auth::request_password_reset_code(&database.pool, &registration.user.email, 15)
        .await
        .expect("reset code should be prepared")
        .expect("delivery should be available");

    auth::confirm_password_reset(
        &database.pool,
        ConfirmPasswordResetRequest {
            email: registration.user.email.clone(),
            code: delivery.code,
            password: "new-password123".to_string(),
            password_confirmation: "new-password123".to_string(),
        },
    )
    .await
    .expect("password reset should succeed");

    let active_sessions_after = sqlx::query(
        "SELECT COUNT(*) AS count
         FROM refresh_sessions
         WHERE user_id = $1
           AND revoked_at IS NULL",
    )
    .bind(registration.user.id)
    .fetch_one(&database.pool)
    .await
    .expect("session count")
    .get::<i64, _>("count");

    assert_eq!(active_sessions_after, 0);

    let old_password_error = auth::login_user(
        &database.pool,
        &auth_config,
        LoginRequest {
            email: registration.user.email.clone(),
            password: "password123".to_string(),
        },
    )
    .await
    .expect_err("old password should no longer work");

    assert_eq!(old_password_error.message, "Invalid credentials");

    let new_password_session = auth::login_user(
        &database.pool,
        &auth_config,
        LoginRequest {
            email: registration.user.email.clone(),
            password: "new-password123".to_string(),
        },
    )
    .await
    .expect("new password should succeed");

    assert_eq!(new_password_session.user.email, registration.user.email);

    database.cleanup().await;
}

#[tokio::test]
async fn authenticated_password_change_reissues_a_session() {
    let Some(database) = TestDatabase::new().await else {
        return;
    };

    let auth_config = test_auth_config();
    let registration = auth::register_user(
        &database.pool,
        24,
        RegisterRequest {
            email: "change-flow@example.test".to_string(),
            password: "password123".to_string(),
            currency: Some("USD".to_string()),
        },
    )
    .await
    .expect("registration should succeed");
    auth::mark_user_email_verified(&database.pool, registration.user.id)
        .await
        .expect("user should be marked verified");

    let initial_session = auth::login_user(
        &database.pool,
        &auth_config,
        LoginRequest {
            email: registration.user.email.clone(),
            password: "password123".to_string(),
        },
    )
    .await
    .expect("initial login should succeed");

    let delivery = auth::request_password_change_code(&database.pool, registration.user.id, 15)
        .await
        .expect("password change code should be prepared");

    let updated_session = auth::confirm_password_change(
        &database.pool,
        &auth_config,
        registration.user.id,
        ConfirmPasswordChangeRequest {
            code: delivery.code,
            password: "changed-password123".to_string(),
            password_confirmation: "changed-password123".to_string(),
        },
    )
    .await
    .expect("password change should succeed");

    assert_eq!(updated_session.user.id, initial_session.user.id);
    assert_ne!(updated_session.refresh_token, initial_session.refresh_token);

    let old_password_error = auth::login_user(
        &database.pool,
        &auth_config,
        LoginRequest {
            email: registration.user.email.clone(),
            password: "password123".to_string(),
        },
    )
    .await
    .expect_err("old password should no longer work");

    assert_eq!(old_password_error.message, "Invalid credentials");

    let new_password_session = auth::login_user(
        &database.pool,
        &auth_config,
        LoginRequest {
            email: registration.user.email.clone(),
            password: "changed-password123".to_string(),
        },
    )
    .await
    .expect("new password should succeed");

    assert_eq!(new_password_session.user.id, registration.user.id);

    database.cleanup().await;
}

#[tokio::test]
async fn password_reset_code_is_revoked_after_too_many_failed_attempts() {
    let Some(database) = TestDatabase::new().await else {
        return;
    };

    let registration = auth::register_user(
        &database.pool,
        24,
        RegisterRequest {
            email: "reset-attempts@example.test".to_string(),
            password: "password123".to_string(),
            currency: Some("USD".to_string()),
        },
    )
    .await
    .expect("registration should succeed");
    auth::mark_user_email_verified(&database.pool, registration.user.id)
        .await
        .expect("user should be marked verified");

    let delivery = auth::request_password_reset_code(&database.pool, &registration.user.email, 15)
        .await
        .expect("reset code should be prepared")
        .expect("delivery should be available");

    for _ in 0..5 {
        let error = auth::confirm_password_reset(
            &database.pool,
            ConfirmPasswordResetRequest {
                email: registration.user.email.clone(),
                code: "000000".to_string(),
                password: "new-password123".to_string(),
                password_confirmation: "new-password123".to_string(),
            },
        )
        .await
        .expect_err("wrong code should fail");

        assert_eq!(error.status, Status::Unauthorized);
    }

    let exhausted_error = auth::confirm_password_reset(
        &database.pool,
        ConfirmPasswordResetRequest {
            email: registration.user.email.clone(),
            code: delivery.code,
            password: "new-password123".to_string(),
            password_confirmation: "new-password123".to_string(),
        },
    )
    .await
    .expect_err("exhausted code should remain invalid");

    assert_eq!(exhausted_error.status, Status::Unauthorized);

    database.cleanup().await;
}

#[tokio::test]
async fn password_change_code_is_revoked_after_too_many_failed_attempts() {
    let Some(database) = TestDatabase::new().await else {
        return;
    };

    let auth_config = test_auth_config();
    let registration = auth::register_user(
        &database.pool,
        24,
        RegisterRequest {
            email: "change-attempts@example.test".to_string(),
            password: "password123".to_string(),
            currency: Some("USD".to_string()),
        },
    )
    .await
    .expect("registration should succeed");
    auth::mark_user_email_verified(&database.pool, registration.user.id)
        .await
        .expect("user should be marked verified");

    let delivery = auth::request_password_change_code(&database.pool, registration.user.id, 15)
        .await
        .expect("password change code should be prepared");

    for _ in 0..5 {
        let error = auth::confirm_password_change(
            &database.pool,
            &auth_config,
            registration.user.id,
            ConfirmPasswordChangeRequest {
                code: "000000".to_string(),
                password: "changed-password123".to_string(),
                password_confirmation: "changed-password123".to_string(),
            },
        )
        .await
        .expect_err("wrong code should fail");

        assert_eq!(error.status, Status::Unauthorized);
    }

    let exhausted_error = auth::confirm_password_change(
        &database.pool,
        &auth_config,
        registration.user.id,
        ConfirmPasswordChangeRequest {
            code: delivery.code,
            password: "changed-password123".to_string(),
            password_confirmation: "changed-password123".to_string(),
        },
    )
    .await
    .expect_err("exhausted code should remain invalid");

    assert_eq!(exhausted_error.status, Status::Unauthorized);

    database.cleanup().await;
}

#[tokio::test]
async fn password_reset_request_respects_silent_cooldown() {
    let Some(database) = TestDatabase::new().await else {
        return;
    };

    let registration = auth::register_user(
        &database.pool,
        24,
        RegisterRequest {
            email: "reset-cooldown@example.test".to_string(),
            password: "password123".to_string(),
            currency: Some("USD".to_string()),
        },
    )
    .await
    .expect("registration should succeed");
    auth::mark_user_email_verified(&database.pool, registration.user.id)
        .await
        .expect("user should be marked verified");

    let first_delivery =
        auth::request_password_reset_code(&database.pool, &registration.user.email, 15)
            .await
            .expect("first reset request should succeed");
    let second_delivery =
        auth::request_password_reset_code(&database.pool, &registration.user.email, 15)
            .await
            .expect("cooldown reset request should be accepted silently");

    assert!(first_delivery.is_some());
    assert!(second_delivery.is_none());

    database.cleanup().await;
}

#[tokio::test]
async fn authenticated_password_change_request_returns_rate_limit_during_cooldown() {
    let Some(database) = TestDatabase::new().await else {
        return;
    };

    let registration = auth::register_user(
        &database.pool,
        24,
        RegisterRequest {
            email: "change-cooldown@example.test".to_string(),
            password: "password123".to_string(),
            currency: Some("USD".to_string()),
        },
    )
    .await
    .expect("registration should succeed");
    auth::mark_user_email_verified(&database.pool, registration.user.id)
        .await
        .expect("user should be marked verified");

    auth::request_password_change_code(&database.pool, registration.user.id, 15)
        .await
        .expect("first password change request should succeed");
    let error = auth::request_password_change_code(&database.pool, registration.user.id, 15)
        .await
        .expect_err("second password change request should be rate-limited");

    assert_eq!(error.status, Status::TooManyRequests);

    database.cleanup().await;
}
