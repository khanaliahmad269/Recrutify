from tests.helpers import register


def test_update_profile_name(client):
    s = register(client, "alice@test.dev", role="job_seeker")
    r = client.patch("/api/auth/me", json={"full_name": "Alice Updated"}, headers=s["headers"])
    assert r.status_code == 200
    assert r.json()["full_name"] == "Alice Updated"


def test_update_profile_email(client):
    s = register(client, "alice@test.dev", role="job_seeker")
    r = client.patch("/api/auth/me", json={"email": "alice2@test.dev"}, headers=s["headers"])
    assert r.status_code == 200
    assert r.json()["email"] == "alice2@test.dev"


def test_update_profile_email_clash_rejected(client):
    s1 = register(client, "alice@test.dev", role="job_seeker")
    register(client, "bob@test.dev", role="job_seeker")
    r = client.patch("/api/auth/me", json={"email": "bob@test.dev"}, headers=s1["headers"])
    assert r.status_code == 400


def test_change_password(client):
    s = register(client, "alice@test.dev", role="job_seeker", password="OldPass1234!")
    r = client.post(
        "/api/auth/me/password",
        json={"current_password": "OldPass1234!", "new_password": "NewPass5678!"},
        headers=s["headers"],
    )
    assert r.status_code == 204

    # Old password should now fail; new one should work
    r = client.post(
        "/api/auth/login",
        data={"username": "alice@test.dev", "password": "OldPass1234!"},
    )
    assert r.status_code == 401
    r = client.post(
        "/api/auth/login",
        data={"username": "alice@test.dev", "password": "NewPass5678!"},
    )
    assert r.status_code == 200


def test_change_password_wrong_current(client):
    s = register(client, "alice@test.dev", role="job_seeker", password="OldPass1234!")
    r = client.post(
        "/api/auth/me/password",
        json={"current_password": "WrongPass!", "new_password": "NewPass5678!"},
        headers=s["headers"],
    )
    assert r.status_code == 400


def test_profile_update_requires_auth(client):
    r = client.patch("/api/auth/me", json={"full_name": "X"})
    assert r.status_code == 401
