use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD, Engine as _};

const NONCE_LENGTH: usize = 12;
const KEY_LENGTH: usize = 32;

#[derive(Debug, Clone)]
pub struct TokenCipher {
    key: [u8; KEY_LENGTH],
}

impl TokenCipher {
    pub fn from_encoded_key(value: &str) -> Result<Self, String> {
        let trimmed = value.trim();

        if trimmed.is_empty() {
            return Err("GOOGLE_TOKEN_ENCRYPTION_KEY must not be empty".to_string());
        }

        let key = decode_key(trimmed)?;

        Ok(Self { key })
    }

    pub fn encrypt(&self, plaintext: &str) -> Result<String, String> {
        let cipher = Aes256Gcm::new_from_slice(&self.key)
            .map_err(|_| "Unable to initialize token cipher".to_string())?;
        let nonce_bytes = aes_gcm::aead::rand_core::RngCore::next_u64(&mut OsRng);
        let mut nonce = [0u8; NONCE_LENGTH];
        nonce[..8].copy_from_slice(&nonce_bytes.to_le_bytes());
        aes_gcm::aead::rand_core::RngCore::fill_bytes(&mut OsRng, &mut nonce[8..]);

        let ciphertext = cipher
            .encrypt(Nonce::from_slice(&nonce), plaintext.as_bytes())
            .map_err(|_| "Unable to encrypt token".to_string())?;

        let mut payload = nonce.to_vec();
        payload.extend(ciphertext);

        Ok(STANDARD.encode(payload))
    }

    pub fn decrypt(&self, payload: &str) -> Result<String, String> {
        let decoded = STANDARD
            .decode(payload.trim())
            .map_err(|_| "Unable to decode encrypted token".to_string())?;

        if decoded.len() <= NONCE_LENGTH {
            return Err("Encrypted token payload is invalid".to_string());
        }

        let (nonce, ciphertext) = decoded.split_at(NONCE_LENGTH);
        let cipher = Aes256Gcm::new_from_slice(&self.key)
            .map_err(|_| "Unable to initialize token cipher".to_string())?;
        let plaintext = cipher
            .decrypt(Nonce::from_slice(nonce), ciphertext)
            .map_err(|_| "Unable to decrypt token".to_string())?;

        String::from_utf8(plaintext).map_err(|_| "Token payload is not valid UTF-8".to_string())
    }
}

fn decode_key(value: &str) -> Result<[u8; KEY_LENGTH], String> {
    if let Ok(bytes) = hex::decode(value) {
        return bytes
            .try_into()
            .map_err(|_| "GOOGLE_TOKEN_ENCRYPTION_KEY must decode to 32 bytes".to_string());
    }

    if let Ok(bytes) = STANDARD.decode(value) {
        return bytes
            .try_into()
            .map_err(|_| "GOOGLE_TOKEN_ENCRYPTION_KEY must decode to 32 bytes".to_string());
    }

    Err("GOOGLE_TOKEN_ENCRYPTION_KEY must be 32 raw bytes encoded as hex or base64".to_string())
}

#[cfg(test)]
mod tests {
    use super::TokenCipher;

    #[test]
    fn encrypts_and_decrypts_round_trip() {
        let cipher = TokenCipher::from_encoded_key(
            "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        )
        .expect("cipher");

        let encrypted = cipher.encrypt("refresh-token").expect("encrypt");
        let decrypted = cipher.decrypt(&encrypted).expect("decrypt");

        assert_eq!(decrypted, "refresh-token");
        assert_ne!(encrypted, "refresh-token");
    }

    #[test]
    fn rejects_wrong_sized_key() {
        let error = TokenCipher::from_encoded_key("abcd").expect_err("invalid key");

        assert!(error.contains("32 bytes"));
    }
}
