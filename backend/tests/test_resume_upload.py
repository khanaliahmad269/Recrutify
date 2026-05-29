import io

import pytest
from docx import Document

from app.services.file_storage import UPLOADS_ROOT
from app.services.resume_parsing import extract_text, ResumeParseError
from tests.helpers import register


def _make_docx_bytes(paragraphs: list[str]) -> bytes:
    """Build a real .docx in memory."""
    doc = Document()
    for p in paragraphs:
        doc.add_paragraph(p)
    buf = io.BytesIO()
    doc.save(buf)
    return buf.getvalue()


SAMPLE_TXT = (
    "Senior frontend engineer with 8 years of React, TypeScript, and design "
    "systems experience. Built customer dashboards at Acme Corp."
).encode("utf-8")


# --- Pure parser unit tests ---


def test_parser_extracts_txt():
    text = extract_text(SAMPLE_TXT, "resume.txt", "text/plain")
    assert "frontend engineer" in text
    assert "Acme Corp" in text


def test_parser_extracts_docx():
    content = _make_docx_bytes(["Headline: Senior Engineer", "Built a thing at Acme."])
    text = extract_text(
        content,
        "resume.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
    assert "Senior Engineer" in text
    assert "Acme" in text


def test_parser_rejects_unknown_type():
    with pytest.raises(ResumeParseError):
        extract_text(b"\x89PNG\r\n\x1a\n", "image.png", "image/png")


# --- HTTP upload integration ---


def _upload_txt(client, seeker, content: bytes = SAMPLE_TXT, filename="resume.txt"):
    return client.post(
        "/api/me/resume/upload",
        files={"file": (filename, content, "text/plain")},
        headers=seeker["headers"],
    )


def test_upload_txt_creates_resume_with_extracted_text(client):
    s = register(client, "alice@test.dev", role="job_seeker")
    r = _upload_txt(client, s)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["original_filename"] == "resume.txt"
    assert body["mime_type"] == "text/plain"
    assert body["file_size"] == len(SAMPLE_TXT)
    assert "frontend engineer" in body["content_text"]
    # On-disk file exists
    assert (UPLOADS_ROOT / str(s["user"]["id"])).exists()


def test_upload_docx_creates_resume(client):
    s = register(client, "alice@test.dev", role="job_seeker")
    docx = _make_docx_bytes(["Built customer dashboards at Acme.", "React + TypeScript"])
    r = client.post(
        "/api/me/resume/upload",
        files={"file": ("resume.docx", docx, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        headers=s["headers"],
    )
    assert r.status_code == 200, r.text
    assert "React" in r.json()["content_text"]


def test_upload_rejects_unsupported_extension(client):
    s = register(client, "alice@test.dev", role="job_seeker")
    r = client.post(
        "/api/me/resume/upload",
        files={"file": ("photo.png", b"\x89PNG", "image/png")},
        headers=s["headers"],
    )
    assert r.status_code == 400


def test_upload_rejects_empty_file(client):
    s = register(client, "alice@test.dev", role="job_seeker")
    r = client.post(
        "/api/me/resume/upload",
        files={"file": ("blank.txt", b"", "text/plain")},
        headers=s["headers"],
    )
    assert r.status_code == 400


def test_upload_rejects_extracted_text_too_short(client):
    s = register(client, "alice@test.dev", role="job_seeker")
    r = client.post(
        "/api/me/resume/upload",
        files={"file": ("tiny.txt", b"hi", "text/plain")},
        headers=s["headers"],
    )
    assert r.status_code == 400


def test_upload_replaces_existing_resume_and_old_file(client):
    s = register(client, "alice@test.dev", role="job_seeker")
    user_id = s["user"]["id"]

    r1 = _upload_txt(client, s, SAMPLE_TXT, "resume-v1.txt")
    first_stored = list((UPLOADS_ROOT / str(user_id)).iterdir())
    assert len(first_stored) == 1

    new_content = b"Python backend engineer with 10 years of FastAPI and Postgres experience."
    r2 = _upload_txt(client, s, new_content, "resume-v2.txt")
    assert r2.status_code == 200
    assert "Python" in r2.json()["content_text"]
    assert r2.json()["original_filename"] == "resume-v2.txt"

    # Old file should be gone; new file present.
    files_now = list((UPLOADS_ROOT / str(user_id)).iterdir())
    assert len(files_now) == 1
    assert files_now[0] != first_stored[0]


def test_download_resume_file_streams_original(client):
    s = register(client, "alice@test.dev", role="job_seeker")
    _upload_txt(client, s)
    r = client.get("/api/me/resume/file", headers=s["headers"])
    assert r.status_code == 200
    assert r.content == SAMPLE_TXT
    # FastAPI sets Content-Disposition for FileResponse with filename=
    assert "resume.txt" in r.headers.get("content-disposition", "")


def test_download_404_when_no_file(client):
    s = register(client, "alice@test.dev", role="job_seeker")
    r = client.get("/api/me/resume/file", headers=s["headers"])
    assert r.status_code == 404


def test_delete_resume_removes_file_from_disk(client):
    s = register(client, "alice@test.dev", role="job_seeker")
    user_id = s["user"]["id"]
    _upload_txt(client, s)
    assert any((UPLOADS_ROOT / str(user_id)).iterdir())

    r = client.delete("/api/me/resume", headers=s["headers"])
    assert r.status_code == 204
    assert list((UPLOADS_ROOT / str(user_id)).iterdir()) == []


def test_upload_requires_seeker_role(client):
    e = register(client, "e@test.dev", role="employer")
    r = client.post(
        "/api/me/resume/upload",
        files={"file": ("r.txt", SAMPLE_TXT, "text/plain")},
        headers=e["headers"],
    )
    assert r.status_code == 403


def test_uploaded_resume_feeds_ai_matching(client):
    """After uploading a React-focused resume, the React job should rank above the data job."""
    from tests.helpers import make_company, make_job

    e = register(client, "e@test.dev", role="employer")
    make_company(client, e, name="Acme")
    react_job = make_job(
        client, e,
        title="Senior React Frontend Engineer",
        description="React + TypeScript + design systems work.",
        requirements="5+ years React, TypeScript, accessibility.",
    )
    make_job(
        client, e,
        title="Data Scientist",
        description="Forecasting and NLP work in Python and scikit-learn.",
        requirements="Python, scikit-learn, NLP.",
    )

    s = register(client, "alice@test.dev", role="job_seeker")
    react_text = (
        b"Senior frontend engineer with 8 years of React, TypeScript, design systems, "
        b"GraphQL and accessibility experience. Led customer dashboard work at Acme Corp."
    )
    r = _upload_txt(client, s, react_text, "alice-cv.txt")
    assert r.status_code == 200

    matches = client.get("/api/me/job-matches", headers=s["headers"]).json()
    assert matches[0]["job"]["id"] == react_job["id"]
