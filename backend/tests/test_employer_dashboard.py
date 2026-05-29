from tests.helpers import make_company, make_job, register


def _employer_with_jobs(client):
    e = register(client, "e@test.dev", role="employer")
    make_company(client, e, name="Acme")
    j1 = make_job(client, e, title="One")
    j2 = make_job(client, e, title="Two")
    return e, j1, j2


def test_my_posted_jobs_lists_only_own(client):
    e, _, _ = _employer_with_jobs(client)

    other = register(client, "e2@test.dev", role="employer")
    make_company(client, other, name="Other")
    make_job(client, other, title="OtherJob")

    r = client.get("/api/me/employer/jobs", headers=e["headers"])
    assert r.status_code == 200
    body = r.json()
    titles = sorted(j["title"] for j in body["items"])
    assert titles == ["One", "Two"]


def test_my_posted_jobs_includes_inactive_by_default(client):
    e, j1, _ = _employer_with_jobs(client)
    # Deactivate the first job
    r = client.patch(f"/api/jobs/{j1['id']}", json={"is_active": False}, headers=e["headers"])
    assert r.status_code == 200

    r = client.get("/api/me/employer/jobs", headers=e["headers"])
    assert r.json()["total"] == 2


def test_my_posted_jobs_can_exclude_inactive(client):
    e, j1, _ = _employer_with_jobs(client)
    client.patch(f"/api/jobs/{j1['id']}", json={"is_active": False}, headers=e["headers"])

    r = client.get("/api/me/employer/jobs", params={"include_inactive": "false"}, headers=e["headers"])
    body = r.json()
    assert body["total"] == 1
    assert body["items"][0]["title"] == "Two"


def test_my_posted_jobs_includes_application_counts(client):
    e, j1, j2 = _employer_with_jobs(client)
    seeker_a = register(client, "a@test.dev", role="job_seeker")
    seeker_b = register(client, "b@test.dev", role="job_seeker")

    client.post(f"/api/jobs/{j1['id']}/apply", json={}, headers=seeker_a["headers"])
    client.post(f"/api/jobs/{j1['id']}/apply", json={}, headers=seeker_b["headers"])
    client.post(f"/api/jobs/{j2['id']}/apply", json={}, headers=seeker_a["headers"])

    r = client.get("/api/me/employer/jobs", headers=e["headers"])
    by_title = {j["title"]: j for j in r.json()["items"]}
    assert by_title["One"]["application_count"] == 2
    assert by_title["One"]["pending_count"] == 2
    assert by_title["Two"]["application_count"] == 1


def test_my_posted_jobs_pending_count_excludes_other_statuses(client):
    e, j1, _ = _employer_with_jobs(client)
    seeker_a = register(client, "a@test.dev", role="job_seeker")
    r = client.post(f"/api/jobs/{j1['id']}/apply", json={}, headers=seeker_a["headers"])
    app_id = r.json()["id"]
    client.patch(
        f"/api/jobs/{j1['id']}/applications/{app_id}",
        json={"status": "shortlisted"},
        headers=e["headers"],
    )

    r = client.get("/api/me/employer/jobs", headers=e["headers"])
    one = next(j for j in r.json()["items"] if j["title"] == "One")
    assert one["application_count"] == 1
    assert one["pending_count"] == 0


def test_my_posted_jobs_requires_employer(client):
    seeker = register(client, "s@test.dev", role="job_seeker")
    r = client.get("/api/me/employer/jobs", headers=seeker["headers"])
    assert r.status_code == 403
