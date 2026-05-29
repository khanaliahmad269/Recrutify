from tests.helpers import make_company, make_job, register


REACT_RESUME = (
    "Senior frontend engineer with 8 years building production React applications. "
    "Deep TypeScript, design systems, GraphQL, and accessibility. "
    "Previously led a team of 5 engineers shipping a customer dashboard at Acme."
)
DATA_RESUME = (
    "Data scientist focused on time-series forecasting and NLP. "
    "Daily Python, scikit-learn, pandas, and pytorch. "
    "Built demand forecasting pipelines across 40 SKUs at a logistics company."
)


def _setup(client):
    e = register(client, "e@test.dev", role="employer")
    make_company(client, e, name="Acme")
    react_job = make_job(
        client, e,
        title="Senior React Frontend Engineer",
        description="Lead our React + TypeScript codebase and design system.",
        requirements="5+ years React, TypeScript, accessibility, design systems.",
        category="Engineering",
    )
    data_job = make_job(
        client, e,
        title="Data Scientist (Forecasting)",
        description="Forecast demand and process customer reviews with NLP.",
        requirements="Python, scikit-learn, time-series forecasting, NLP.",
        category="Data",
    )
    return e, react_job, data_job


def _add_resume(client, seeker, text):
    return client.put("/api/me/resume", json={"content_text": text}, headers=seeker["headers"])


def test_job_matches_returns_higher_score_for_more_relevant_job(client):
    _, react_job, data_job = _setup(client)
    seeker = register(client, "alice@test.dev", role="job_seeker")
    _add_resume(client, seeker, REACT_RESUME)

    r = client.get("/api/me/job-matches", headers=seeker["headers"])
    assert r.status_code == 200
    matches = r.json()
    assert len(matches) == 2
    # Top match should be the React role for a React resume.
    assert matches[0]["job"]["id"] == react_job["id"]
    assert matches[0]["score"] > matches[1]["score"]
    assert 0.0 <= matches[0]["score"] <= 1.0


def test_job_matches_data_resume_ranks_data_job_first(client):
    _, _, data_job = _setup(client)
    seeker = register(client, "bob@test.dev", role="job_seeker")
    _add_resume(client, seeker, DATA_RESUME)

    matches = client.get("/api/me/job-matches", headers=seeker["headers"]).json()
    assert matches[0]["job"]["id"] == data_job["id"]


def test_job_matches_without_resume_returns_400(client):
    _setup(client)
    seeker = register(client, "alice@test.dev", role="job_seeker")
    r = client.get("/api/me/job-matches", headers=seeker["headers"])
    assert r.status_code == 400


def test_job_matches_requires_seeker_role(client):
    e, _, _ = _setup(client)
    r = client.get("/api/me/job-matches", headers=e["headers"])
    assert r.status_code == 403


def test_applicant_scores_ranks_best_resume_first(client):
    e, react_job, _ = _setup(client)
    alice = register(client, "alice@test.dev", role="job_seeker")
    bob = register(client, "bob@test.dev", role="job_seeker")
    _add_resume(client, alice, REACT_RESUME)
    _add_resume(client, bob, DATA_RESUME)
    client.post(f"/api/jobs/{react_job['id']}/apply", json={}, headers=alice["headers"])
    client.post(f"/api/jobs/{react_job['id']}/apply", json={}, headers=bob["headers"])

    r = client.get(f"/api/jobs/{react_job['id']}/applicant-scores", headers=e["headers"])
    assert r.status_code == 200
    ranked = r.json()
    assert len(ranked) == 2
    assert ranked[0]["applicant"]["email"] == "alice@test.dev"
    assert ranked[0]["score"] > ranked[1]["score"]
    assert ranked[0]["has_resume"] is True


def test_applicant_scores_handles_applicant_without_resume(client):
    e, react_job, _ = _setup(client)
    alice = register(client, "alice@test.dev", role="job_seeker")
    bob = register(client, "bob@test.dev", role="job_seeker")
    _add_resume(client, alice, REACT_RESUME)
    # bob does NOT have a resume
    client.post(f"/api/jobs/{react_job['id']}/apply", json={}, headers=alice["headers"])
    client.post(f"/api/jobs/{react_job['id']}/apply", json={}, headers=bob["headers"])

    ranked = client.get(f"/api/jobs/{react_job['id']}/applicant-scores", headers=e["headers"]).json()
    # Alice (has resume) ranks first; Bob (no resume) has score=0 and ranks last
    assert ranked[0]["applicant"]["email"] == "alice@test.dev"
    assert ranked[1]["applicant"]["email"] == "bob@test.dev"
    assert ranked[1]["has_resume"] is False
    assert ranked[1]["score"] == 0.0


def test_applicant_scores_403_for_other_employer(client):
    e, react_job, _ = _setup(client)
    other = register(client, "e2@test.dev", role="employer")
    make_company(client, other, name="Other")
    r = client.get(f"/api/jobs/{react_job['id']}/applicant-scores", headers=other["headers"])
    assert r.status_code == 403
