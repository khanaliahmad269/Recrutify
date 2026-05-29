"""Resume ↔ job matching using TF-IDF + cosine similarity.

Strategy: vectorize the resume(s) + job(s) together so they share a vocabulary,
then compute cosine similarity between the relevant rows. Scores are in [0, 1].

These are pure functions — they don't touch the database. Callers fetch the
SQLAlchemy objects, extract text, then pass the lists in.
"""
from __future__ import annotations

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.models.job import Job
from app.models.resume import Resume


def job_corpus_text(job: Job) -> str:
    parts = [
        job.title or "",
        (job.category or "") * 2,  # weight category modestly
        job.description or "",
        job.requirements or "",
    ]
    return " ".join(p for p in parts if p)


def resume_corpus_text(resume: Resume) -> str:
    parts = [
        resume.headline or "",
        resume.summary or "",
        resume.content_text or "",
    ]
    return " ".join(p for p in parts if p)


def _vectorizer() -> TfidfVectorizer:
    return TfidfVectorizer(
        stop_words="english",
        ngram_range=(1, 2),
        max_features=5000,
        sublinear_tf=True,
        min_df=1,
    )


def score_resume_against_jobs(
    resume_text: str, jobs: list[Job], top_k: int | None = None
) -> list[tuple[Job, float]]:
    """Return [(job, score), ...] sorted by score descending."""
    if not jobs or not resume_text.strip():
        return []

    docs = [job_corpus_text(j) for j in jobs] + [resume_text]
    matrix = _vectorizer().fit_transform(docs)
    sims = cosine_similarity(matrix[-1], matrix[:-1])[0]
    scored = sorted(zip(jobs, [float(s) for s in sims]), key=lambda x: x[1], reverse=True)
    return scored[:top_k] if top_k else scored


def score_resumes_against_job(
    job_text: str, resumes: list[Resume], top_k: int | None = None
) -> list[tuple[Resume, float]]:
    """Return [(resume, score), ...] sorted by score descending."""
    if not resumes or not job_text.strip():
        return []

    docs = [resume_corpus_text(r) for r in resumes] + [job_text]
    matrix = _vectorizer().fit_transform(docs)
    sims = cosine_similarity(matrix[-1], matrix[:-1])[0]
    scored = sorted(zip(resumes, [float(s) for s in sims]), key=lambda x: x[1], reverse=True)
    return scored[:top_k] if top_k else scored
