from tests.helpers import make_company, register


def test_employer_can_create_company(client):
    e = register(client, "e1@test.dev", role="employer")
    c = make_company(client, e, name="Acme Corp")
    assert c["name"] == "Acme Corp"
    assert c["slug"] == "acme-corp"
    assert c["owner_id"] == e["user"]["id"]


def test_employer_cannot_own_two_companies(client):
    e = register(client, "e1@test.dev", role="employer")
    make_company(client, e, name="First")
    r = client.post(
        "/api/companies",
        json={"name": "Second", "description": "x"},
        headers=e["headers"],
    )
    assert r.status_code == 400


def test_job_seeker_cannot_create_company(client):
    seeker = register(client, "s1@test.dev", role="job_seeker")
    r = client.post(
        "/api/companies",
        json={"name": "Should Fail", "description": "x"},
        headers=seeker["headers"],
    )
    assert r.status_code == 403


def test_list_companies_searches_by_name(client):
    e1 = register(client, "e1@test.dev", role="employer")
    e2 = register(client, "e2@test.dev", role="employer")
    make_company(client, e1, name="Acme Corp")
    make_company(client, e2, name="Northwind")

    r = client.get("/api/companies", params={"q": "wind"})
    assert r.status_code == 200
    names = [c["name"] for c in r.json()["items"]]
    assert names == ["Northwind"]


def test_unique_slug_collision(client):
    e1 = register(client, "e1@test.dev", role="employer")
    e2 = register(client, "e2@test.dev", role="employer")
    c1 = make_company(client, e1, name="Acme")
    c2 = make_company(client, e2, name="Acme")
    assert c1["slug"] == "acme"
    assert c2["slug"] == "acme-2"


def test_get_my_company(client):
    e = register(client, "e1@test.dev", role="employer")
    make_company(client, e, name="Acme")
    r = client.get("/api/companies/me/owned", headers=e["headers"])
    assert r.status_code == 200
    assert r.json()["name"] == "Acme"


def test_update_own_company(client):
    e = register(client, "e1@test.dev", role="employer")
    c = make_company(client, e, name="Acme")
    r = client.patch(
        f"/api/companies/{c['id']}",
        json={"industry": "Manufacturing"},
        headers=e["headers"],
    )
    assert r.status_code == 200
    assert r.json()["industry"] == "Manufacturing"


def test_cannot_update_other_company(client):
    e1 = register(client, "e1@test.dev", role="employer")
    e2 = register(client, "e2@test.dev", role="employer")
    c = make_company(client, e1, name="Acme")
    r = client.patch(
        f"/api/companies/{c['id']}",
        json={"industry": "Hack"},
        headers=e2["headers"],
    )
    assert r.status_code == 403
