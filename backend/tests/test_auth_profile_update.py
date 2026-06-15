"""Integration tests for authenticated profile updates and password changes."""
from fastapi.testclient import TestClient

import models
from utils.auth import hash_password


def _create_user(db, *, username="profileuser", email="profile@example.com", password="Password123"):
    user = models.User(
        username=username,
        email=email,
        hashed_password=hash_password(password),
        full_name="Profile User",
        role=models.UserRole.CUSTOMER,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _login(client: TestClient, *, email: str, password: str) -> dict:
    response = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200, response.text
    return response.json()


def _auth_headers(access_token: str) -> dict:
    return {"Authorization": f"Bearer {access_token}"}


class TestUpdateCurrentUser:
    def test_update_profile_without_password_still_works(self, client, db_session):
        user = _create_user(db_session, username="profile-ok", email="profile-ok@example.com")
        tokens = _login(client, email=user.email, password="Password123")

        response = client.put(
            "/api/auth/me",
            json={"full_name": "Updated Name", "city": "Ho Chi Minh City"},
            headers=_auth_headers(tokens["access_token"]),
        )

        assert response.status_code == 200, response.text
        data = response.json()
        assert data["full_name"] == "Updated Name"
        assert data["city"] == "Ho Chi Minh City"

    def test_update_password_requires_current_password(self, client, db_session):
        user = _create_user(db_session, username="profile-missing", email="profile-missing@example.com")
        tokens = _login(client, email=user.email, password="Password123")

        response = client.put(
            "/api/auth/me",
            json={"password": "NewPassword123"},
            headers=_auth_headers(tokens["access_token"]),
        )

        assert response.status_code == 400
        assert response.json()["detail"] == "Cần nhập mật khẩu hiện tại khi đổi mật khẩu"

    def test_update_password_rejects_wrong_current_password(self, client, db_session):
        user = _create_user(db_session, username="profile-wrong", email="profile-wrong@example.com")
        tokens = _login(client, email=user.email, password="Password123")

        response = client.put(
            "/api/auth/me",
            json={
                "password": "NewPassword123",
                "current_password": "WrongPassword123",
            },
            headers=_auth_headers(tokens["access_token"]),
        )

        assert response.status_code == 400
        assert response.json()["detail"] == "Mật khẩu hiện tại không đúng"

    def test_update_password_increments_token_version_and_revokes_old_refresh_token(self, client, db_session):
        user = _create_user(db_session, username="profile-rotate", email="profile-rotate@example.com")
        tokens = _login(client, email=user.email, password="Password123")
        old_access_token = tokens["access_token"]
        old_refresh_token = tokens["refresh_token"]

        response = client.put(
            "/api/auth/me",
            json={
                "password": "NewPassword123",
                "current_password": "Password123",
            },
            headers=_auth_headers(tokens["access_token"]),
        )

        assert response.status_code == 200, response.text

        db_session.refresh(user)
        assert user.token_version == 1

        old_access_response = client.get(
            "/api/auth/me",
            headers=_auth_headers(old_access_token),
        )
        assert old_access_response.status_code == 401

        refresh_response = client.post(
            "/api/auth/refresh",
            json={"refresh_token": old_refresh_token},
        )
        assert refresh_response.status_code == 401

        relogin_response = client.post(
            "/api/auth/login",
            json={"email": user.email, "password": "NewPassword123"},
        )
        assert relogin_response.status_code == 200, relogin_response.text
