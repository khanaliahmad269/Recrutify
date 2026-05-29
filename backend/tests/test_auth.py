def _register(client, email="alice@example.com", password="strongpass123"):
    return client.post(
        "/api/auth/register",
        json={"email": email, "full_name": "Alice", "password": password, "role": "job_seeker"},
    )


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_register_returns_tokens_and_user(client):
    r = _register(client)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["user"]["email"] == "alice@example.com"
    assert body["user"]["role"] == "job_seeker"
    assert body["tokens"]["access_token"]
    assert body["tokens"]["refresh_token"]


def test_register_duplicate_email_rejected(client):
    assert _register(client).status_code == 201
    r = _register(client)
    assert r.status_code == 400


def test_login_with_correct_password(client):
    _register(client)
    r = client.post(
        "/api/auth/login",
        data={"username": "alice@example.com", "password": "strongpass123"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["tokens"]["access_token"]


def test_login_with_wrong_password_rejected(client):
    _register(client)
    r = client.post(
        "/api/auth/login",
        data={"username": "alice@example.com", "password": "wrongpass"},
    )
    assert r.status_code == 401


def test_me_requires_auth(client):
    r = client.get("/api/auth/me")
    assert r.status_code == 401


def test_me_returns_current_user(client):
    reg = _register(client).json()
    token = reg["tokens"]["access_token"]
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == "alice@example.com"


def test_refresh_returns_new_tokens(client):
    reg = _register(client).json()
    r = client.post("/api/auth/refresh", json={"refresh_token": reg["tokens"]["refresh_token"]})
    assert r.status_code == 200
    assert r.json()["access_token"]
