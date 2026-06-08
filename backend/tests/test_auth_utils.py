"""
[M6] Unit tests — utils/auth.py
Covers: password hashing, JWT access/refresh tokens, token versioning (H1).
"""
import pytest
from datetime import timedelta

from utils.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_token,
    get_user_id_from_token,
)


class TestPasswordHashing:
    def test_hash_is_not_plaintext(self):
        hashed = hash_password("mysecret")
        assert hashed != "mysecret"

    def test_verify_correct_password(self):
        hashed = hash_password("correct-horse-battery-staple")
        assert verify_password("correct-horse-battery-staple", hashed) is True

    def test_verify_wrong_password(self):
        hashed = hash_password("correct")
        assert verify_password("wrong", hashed) is False

    def test_two_hashes_of_same_password_differ(self):
        h1 = hash_password("samepassword")
        h2 = hash_password("samepassword")
        assert h1 != h2  # bcrypt uses different salts each time


class TestAccessToken:
    def test_creates_and_decodes_token(self):
        token = create_access_token({"sub": "42"})
        payload = verify_token(token, token_type="access")
        assert payload is not None
        assert payload["sub"] == "42"

    def test_wrong_token_type_rejected(self):
        token = create_access_token({"sub": "1"})
        payload = verify_token(token, token_type="refresh")
        assert payload is None

    def test_expired_token_rejected(self):
        token = create_access_token({"sub": "1"}, expires_delta=timedelta(seconds=-1))
        payload = verify_token(token, token_type="access")
        assert payload is None

    def test_get_user_id_from_token(self):
        token = create_access_token({"sub": "99"})
        user_id = get_user_id_from_token(token)
        assert user_id == 99

    def test_get_user_id_invalid_token(self):
        user_id = get_user_id_from_token("notavalidtoken")
        assert user_id is None


class TestRefreshToken:
    def test_creates_and_decodes_refresh_token(self):
        token = create_refresh_token({"sub": "5", "ver": 3})
        payload = verify_token(token, token_type="refresh")
        assert payload is not None
        assert payload["sub"] == "5"
        assert payload["ver"] == 3

    def test_refresh_token_rejected_as_access(self):
        token = create_refresh_token({"sub": "5", "ver": 0})
        payload = verify_token(token, token_type="access")
        assert payload is None

    def test_token_version_stored_in_payload(self):
        """[H1] token_version must travel inside the refresh token payload."""
        token = create_refresh_token({"sub": "7", "ver": 12})
        payload = verify_token(token, token_type="refresh")
        assert payload["ver"] == 12
