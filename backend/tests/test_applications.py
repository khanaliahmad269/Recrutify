from tests.helpers import make_company, make_job, register


def _setup(client):
    employer = register(client, "e@test.dev", role="employer")
    make_company(client, employer, name="Acme")
    job = make_job(client, employer, title="Engineer")
    seeker = register(client, "s@test.dev", role="job_seeker")
    return employer, seeker, job


def test_seeker_can_apply(client):
    _, seeker, job = _setup(client)
    r = client.post(
        f"/api/jobs/{job['id']}/apply",
        json={"cover_letter": "Pick me"},
        headers=seeker["headers"],
    )
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == "pending"
    assert body["cover_letter"] == "Pick me"


def test_seeker_cannot_apply_twice(client):
    _, seeker, job = _setup(client)
    client.post(f"/api/jobs/{job['id']}/apply", json={}, headers=seeker["headers"])
    r = client.post(f"/api/jobs/{job['id']}/apply", json={}, headers=seeker["headers"])
    assert r.status_code == 400


def test_employer_cannot_apply(client):
    employer, _, job = _setup(client)
    r = client.post(f"/api/jobs/{job['id']}/apply", json={}, headers=employer["headers"])
    assert r.status_code == 403


def test_my_applications_lists_only_own(client):
    _, seeker, job = _setup(client)
    other_seeker = register(client, "s2@test.dev", role="job_seeker")
    client.post(f"/api/jobs/{job['id']}/apply", json={}, headers=seeker["headers"])
    client.post(f"/api/jobs/{job['id']}/apply", json={}, headers=other_seeker["headers"])

    r = client.get("/api/me/applications", headers=seeker["headers"])
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 1
    assert body["items"][0]["applicant_id"] == seeker["user"]["id"]


def test_employer_can_list_applications_for_their_job(client):
    employer, seeker, job = _setup(client)
    client.post(f"/api/jobs/{job['id']}/apply", json={"cover_letter": "hi"}, headers=seeker["headers"])

    r = client.get(f"/api/jobs/{job['id']}/applications", headers=employer["headers"])
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 1
    assert body["items"][0]["applicant"]["email"] == "s@test.dev"


def test_other_employer_cannot_list_applications(client):
    employer, seeker, job = _setup(client)
    client.post(f"/api/jobs/{job['id']}/apply", json={}, headers=seeker["headers"])

    other = register(client, "e2@test.dev", role="employer")
    make_company(client, other, name="OtherCo")
    r = client.get(f"/api/jobs/{job['id']}/applications", headers=other["headers"])
    assert r.status_code == 403


def test_employer_can_update_application_status(client):
    employer, seeker, job = _setup(client)
    r = client.post(
        f"/api/jobs/{job['id']}/apply", json={}, headers=seeker["headers"]
    )
    app_id = r.json()["id"]

    r = client.patch(
        f"/api/jobs/{job['id']}/applications/{app_id}",
        json={"status": "shortlisted"},
        headers=employer["headers"],
    )
    assert r.status_code == 200
    assert r.json()["status"] == "shortlisted"


def test_cannot_apply_to_inactive_job(client):
    employer, seeker, job = _setup(client)
    client.patch(f"/api/jobs/{job['id']}", json={"is_active": False}, headers=employer["headers"])
    r = client.post(f"/api/jobs/{job['id']}/apply", json={}, headers=seeker["headers"])
    assert r.status_code == 404
