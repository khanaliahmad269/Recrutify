from tests.helpers import make_company, make_job, register


def _setup_employer_with_company(client, email="e@test.dev"):
    e = register(client, email, role="employer")
    make_company(client, e, name="Acme")
    return e


def test_employer_can_post_job(client):
    e = _setup_employer_with_company(client)
    job = make_job(client, e, title="Senior Engineer")
    assert job["title"] == "Senior Engineer"
    assert job["is_active"] is True
    assert job["posted_by_id"] == e["user"]["id"]


def test_employer_without_company_cannot_post(client):
    e = register(client, "e@test.dev", role="employer")
    r = client.post(
        "/api/jobs",
        json={
            "title": "Engineer",
            "description": "Build things",
            "employment_type": "full_time",
            "experience_level": "mid",
        },
        headers=e["headers"],
    )
    assert r.status_code == 400


def test_job_seeker_cannot_post_job(client):
    seeker = register(client, "s@test.dev", role="job_seeker")
    r = client.post(
        "/api/jobs",
        json={
            "title": "Engineer",
            "description": "x",
            "employment_type": "full_time",
            "experience_level": "mid",
        },
        headers=seeker["headers"],
    )
    assert r.status_code == 403


def test_list_jobs_returns_pagination(client):
    e = _setup_employer_with_company(client)
    for i in range(3):
        make_job(client, e, title=f"Role {i}")

    r = client.get("/api/jobs", params={"page": 1, "page_size": 2})
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 3
    assert body["pages"] == 2
    assert len(body["items"]) == 2


def test_search_jobs_by_query(client):
    e = _setup_employer_with_company(client)
    make_job(client, e, title="Frontend Engineer", description="React work")
    make_job(client, e, title="Data Scientist", description="ML work")

    r = client.get("/api/jobs", params={"q": "React"})
    assert r.status_code == 200
    titles = [j["title"] for j in r.json()["items"]]
    assert titles == ["Frontend Engineer"]


def test_filter_jobs_by_remote_and_type(client):
    e = _setup_employer_with_company(client)
    make_job(client, e, title="Remote Full", is_remote=True, employment_type="full_time")
    make_job(client, e, title="Onsite Contract", is_remote=False, employment_type="contract", location="NYC")

    r = client.get("/api/jobs", params={"is_remote": "true"})
    titles = [j["title"] for j in r.json()["items"]]
    assert titles == ["Remote Full"]

    r = client.get("/api/jobs", params={"employment_type": "contract"})
    titles = [j["title"] for j in r.json()["items"]]
    assert titles == ["Onsite Contract"]


def test_filter_by_salary_min(client):
    e = _setup_employer_with_company(client)
    make_job(client, e, title="Low", salary_min=40000, salary_max=60000)
    make_job(client, e, title="High", salary_min=120000, salary_max=180000)

    r = client.get("/api/jobs", params={"salary_min": 100000})
    titles = sorted(j["title"] for j in r.json()["items"])
    assert titles == ["High"]


def test_get_single_job_includes_company(client):
    e = _setup_employer_with_company(client)
    job = make_job(client, e, title="Engineer")
    r = client.get(f"/api/jobs/{job['id']}")
    assert r.status_code == 200
    assert r.json()["company"]["name"] == "Acme"


def test_update_own_job(client):
    e = _setup_employer_with_company(client)
    job = make_job(client, e, title="Engineer")
    r = client.patch(
        f"/api/jobs/{job['id']}",
        json={"title": "Senior Engineer"},
        headers=e["headers"],
    )
    assert r.status_code == 200
    assert r.json()["title"] == "Senior Engineer"


def test_cannot_update_others_job(client):
    e1 = _setup_employer_with_company(client, "e1@test.dev")
    e2 = register(client, "e2@test.dev", role="employer")
    make_company(client, e2, name="Other")
    job = make_job(client, e1, title="Mine")

    r = client.patch(
        f"/api/jobs/{job['id']}",
        json={"title": "Hijacked"},
        headers=e2["headers"],
    )
    assert r.status_code == 403


def test_delete_own_job(client):
    e = _setup_employer_with_company(client)
    job = make_job(client, e, title="Tmp")
    r = client.delete(f"/api/jobs/{job['id']}", headers=e["headers"])
    assert r.status_code == 204
    r = client.get(f"/api/jobs/{job['id']}")
    assert r.status_code == 404


def test_salary_range_validation_rejects_inverted(client):
    e = _setup_employer_with_company(client)
    r = client.post(
        "/api/jobs",
        json={
            "title": "Bad",
            "description": "x",
            "employment_type": "full_time",
            "experience_level": "mid",
            "salary_min": 100000,
            "salary_max": 50000,
        },
        headers=e["headers"],
    )
    assert r.status_code == 422
