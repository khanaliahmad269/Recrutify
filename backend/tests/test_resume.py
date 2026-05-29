from tests.helpers import register

SAMPLE_RESUME = (
    "Senior software engineer with 8 years of experience in Python, React, "
    "and distributed systems. Led teams of 4-6 engineers shipping production "
    "ML pipelines."
)


def test_get_resume_404_when_missing(client):
    s = register(client, "alice@test.dev", role="job_seeker")
    r = client.get("/api/me/resume", headers=s["headers"])
    assert r.status_code == 404


def test_create_resume(client):
    s = register(client, "alice@test.dev", role="job_seeker")
    r = client.put(
        "/api/me/resume",
        json={
            "headline": "Senior Engineer",
            "summary": "8 years of Python + React",
            "content_text": SAMPLE_RESUME,
        },
        headers=s["headers"],
    )
    assert r.status_code == 200
    body = r.json()
    assert body["headline"] == "Senior Engineer"
    assert body["content_text"].startswith("Senior software engineer")


def test_update_resume_replaces_content(client):
    s = register(client, "alice@test.dev", role="job_seeker")
    client.put(
        "/api/me/resume",
        json={"headline": "v1", "content_text": SAMPLE_RESUME},
        headers=s["headers"],
    )
    r = client.put(
        "/api/me/resume",
        json={"headline": "v2", "content_text": SAMPLE_RESUME + " Plus an update."},
        headers=s["headers"],
    )
    assert r.status_code == 200
    assert r.json()["headline"] == "v2"
    assert r.json()["content_text"].endswith("Plus an update.")

    # Still only one resume on file
    r = client.get("/api/me/resume", headers=s["headers"])
    assert r.json()["headline"] == "v2"


def test_delete_resume(client):
    s = register(client, "alice@test.dev", role="job_seeker")
    client.put(
        "/api/me/resume",
        json={"content_text": SAMPLE_RESUME},
        headers=s["headers"],
    )
    r = client.delete("/api/me/resume", headers=s["headers"])
    assert r.status_code == 204
    r = client.get("/api/me/resume", headers=s["headers"])
    assert r.status_code == 404


def test_resume_requires_job_seeker_role(client):
    employer = register(client, "e@test.dev", role="employer")
    r = client.put(
        "/api/me/resume",
        json={"content_text": SAMPLE_RESUME},
        headers=employer["headers"],
    )
    assert r.status_code == 403


def test_resume_content_too_short_rejected(client):
    s = register(client, "alice@test.dev", role="job_seeker")
    r = client.put(
        "/api/me/resume",
        json={"content_text": "short"},
        headers=s["headers"],
    )
    assert r.status_code == 422
