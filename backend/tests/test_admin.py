from tests.helpers import make_company, make_job, register


def _make_admin(client) -> dict:
    """Helper: register as job_seeker then promote to admin via direct DB tweak via API.
    Since we can't promote via the API without an existing admin, we use the test fixture
    path: register, then use a separate session to set role=admin.
    """
    # Easier: register, then exploit the fact that conftest test DB has no admin seed.
    # We need to bootstrap one admin manually.
    from sqlalchemy import select

    from app import database as db_module
    from app.models import User, UserRole

    user_data = register(client, "boot_admin@test.dev", role="job_seeker")
    # Find the per-test SessionLocal override by reusing the dependency override factory.
    # Simpler: open a session via the same TestingSession bound by conftest.
    gen = db_module.SessionLocal  # NOTE: tests override get_db, but SessionLocal points to prod engine.
    # Instead, use the override's session via FastAPI's app.dependency_overrides.
    from app.main import app

    db_gen = app.dependency_overrides[db_module.get_db]()
    s = next(db_gen)
    try:
        u = s.scalar(select(User).where(User.email == "boot_admin@test.dev"))
        u.role = UserRole.ADMIN
        s.commit()
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass
    user_data["user"]["role"] = "admin"
    return user_data


def test_admin_stats_returns_aggregates(client):
    admin = _make_admin(client)
    register(client, "s1@test.dev", role="job_seeker")
    register(client, "s2@test.dev", role="job_seeker")
    e = register(client, "e@test.dev", role="employer")
    make_company(client, e, name="Acme")
    make_job(client, e, title="One")

    r = client.get("/api/admin/stats", headers=admin["headers"])
    assert r.status_code == 200
    body = r.json()
    assert body["total_users"] == 4  # admin + 2 seekers + 1 employer
    assert body["seekers"] == 2
    assert body["employers"] == 1
    assert body["admins"] == 1
    assert body["total_jobs"] == 1
    assert body["active_jobs"] == 1
    assert body["total_companies"] == 1


def test_admin_users_filter_by_role(client):
    admin = _make_admin(client)
    register(client, "s1@test.dev", role="job_seeker")
    register(client, "s2@test.dev", role="job_seeker")
    register(client, "e@test.dev", role="employer")

    r = client.get("/api/admin/users", params={"role": "job_seeker"}, headers=admin["headers"])
    assert r.status_code == 200
    assert r.json()["total"] == 2


def test_admin_search_users(client):
    admin = _make_admin(client)
    register(client, "alice@test.dev", role="job_seeker")
    register(client, "bob@test.dev", role="job_seeker")

    r = client.get("/api/admin/users", params={"q": "alice"}, headers=admin["headers"])
    assert r.json()["total"] == 1
    assert r.json()["items"][0]["email"] == "alice@test.dev"


def test_admin_can_deactivate_user(client):
    admin = _make_admin(client)
    target = register(client, "naughty@test.dev", role="job_seeker")
    r = client.patch(
        f"/api/admin/users/{target['user']['id']}",
        json={"is_active": False},
        headers=admin["headers"],
    )
    assert r.status_code == 200
    assert r.json()["is_active"] is False

    # Deactivated user can't access protected endpoints
    r = client.get("/api/auth/me", headers=target["headers"])
    assert r.status_code == 401


def test_admin_cannot_deactivate_self(client):
    admin = _make_admin(client)
    r = client.patch(
        f"/api/admin/users/{admin['user']['id']}",
        json={"is_active": False},
        headers=admin["headers"],
    )
    assert r.status_code == 400


def test_admin_cannot_demote_self(client):
    admin = _make_admin(client)
    r = client.patch(
        f"/api/admin/users/{admin['user']['id']}",
        json={"role": "job_seeker"},
        headers=admin["headers"],
    )
    assert r.status_code == 400


def test_admin_verify_company(client):
    admin = _make_admin(client)
    e = register(client, "e@test.dev", role="employer")
    c = make_company(client, e, name="Acme")
    assert c["is_verified"] is False

    r = client.patch(
        f"/api/admin/companies/{c['id']}/verify",
        json={"is_verified": True},
        headers=admin["headers"],
    )
    assert r.status_code == 200
    assert r.json()["is_verified"] is True


def test_admin_deactivate_job(client):
    admin = _make_admin(client)
    e = register(client, "e@test.dev", role="employer")
    make_company(client, e, name="Acme")
    job = make_job(client, e, title="Job")
    r = client.patch(
        f"/api/admin/jobs/{job['id']}",
        json={"is_active": False},
        headers=admin["headers"],
    )
    assert r.status_code == 200
    assert r.json()["is_active"] is False


def test_admin_endpoints_reject_non_admin(client):
    seeker = register(client, "s@test.dev", role="job_seeker")
    for path in ("/api/admin/stats", "/api/admin/users", "/api/admin/jobs", "/api/admin/companies"):
        r = client.get(path, headers=seeker["headers"])
        assert r.status_code == 403, path
