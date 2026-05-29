"""Helpers shared across API tests."""
from __future__ import annotations


def register(client, email: str, role: str = "job_seeker", password: str = "Pass1234!") -> dict:
    r = client.post(
        "/api/auth/register",
        json={"email": email, "full_name": email.split("@")[0].title(), "password": password, "role": role},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    return {
        "user": body["user"],
        "token": body["tokens"]["access_token"],
        "refresh": body["tokens"]["refresh_token"],
        "headers": {"Authorization": f"Bearer {body['tokens']['access_token']}"},
    }


def make_company(client, employer: dict, name: str = "Acme") -> dict:
    r = client.post(
        "/api/companies",
        json={"name": name, "description": f"{name} description"},
        headers=employer["headers"],
    )
    assert r.status_code == 201, r.text
    return r.json()


def make_job(client, employer: dict, **overrides) -> dict:
    payload = {
        "title": "Senior Engineer",
        "description": "Build great things.",
        "location": "Remote",
        "is_remote": True,
        "employment_type": "full_time",
        "experience_level": "senior",
        "category": "Engineering",
        "salary_min": 100000,
        "salary_max": 150000,
    }
    payload.update(overrides)
    r = client.post("/api/jobs", json=payload, headers=employer["headers"])
    assert r.status_code == 201, r.text
    return r.json()
