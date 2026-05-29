from tests.helpers import make_company, make_job, register


def _setup(client):
    employer = register(client, "e@test.dev", role="employer")
    make_company(client, employer, name="Acme")
    job = make_job(client, employer, title="Engineer")
    seeker = register(client, "s@test.dev", role="job_seeker")
    return seeker, job


def test_save_then_list(client):
    seeker, job = _setup(client)
    r = client.post(f"/api/me/saved-jobs/{job['id']}", headers=seeker["headers"])
    assert r.status_code == 201

    r = client.get("/api/me/saved-jobs", headers=seeker["headers"])
    body = r.json()
    assert body["total"] == 1
    assert body["items"][0]["job"]["title"] == "Engineer"


def test_save_is_idempotent(client):
    seeker, job = _setup(client)
    client.post(f"/api/me/saved-jobs/{job['id']}", headers=seeker["headers"])
    r = client.post(f"/api/me/saved-jobs/{job['id']}", headers=seeker["headers"])
    assert r.status_code == 201  # returns existing without creating a dup

    r = client.get("/api/me/saved-jobs", headers=seeker["headers"])
    assert r.json()["total"] == 1


def test_unsave(client):
    seeker, job = _setup(client)
    client.post(f"/api/me/saved-jobs/{job['id']}", headers=seeker["headers"])
    r = client.delete(f"/api/me/saved-jobs/{job['id']}", headers=seeker["headers"])
    assert r.status_code == 204

    r = client.get("/api/me/saved-jobs", headers=seeker["headers"])
    assert r.json()["total"] == 0


def test_unsave_missing_returns_404(client):
    seeker, job = _setup(client)
    r = client.delete(f"/api/me/saved-jobs/{job['id']}", headers=seeker["headers"])
    assert r.status_code == 404


def test_employer_cannot_save(client):
    employer = register(client, "e2@test.dev", role="employer")
    make_company(client, employer, name="X")
    job = make_job(client, employer, title="Self")
    r = client.post(f"/api/me/saved-jobs/{job['id']}", headers=employer["headers"])
    assert r.status_code == 403
