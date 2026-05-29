import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { FiArrowLeft, FiMail, FiCheck } from 'react-icons/fi'
import { jobsApi, matchingApi } from '../../services/api.js'
import Pagination from '../../components/Pagination.jsx'
import Empty from '../../components/Empty.jsx'
import MatchScore from '../../components/MatchScore.jsx'
import { SkeletonList } from '../../components/Skeleton.jsx'

const STATUSES = ['pending', 'reviewed', 'shortlisted', 'rejected', 'hired']
const BADGE = {
  pending: 'bg-slate-100 text-slate-700',
  reviewed: 'bg-blue-50 text-blue-700',
  shortlisted: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  hired: 'bg-amber-50 text-amber-800',
}

export default function JobApplicants() {
  const { id } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get('page') || 1)
  const filterStatus = searchParams.get('status') || ''

  const [job, setJob] = useState(null)
  const [data, setData] = useState(null)
  const [scoresByApp, setScoresByApp] = useState({})
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)

  const load = (p = page) => {
    setData(null)
    return jobsApi
      .applicationsForJob(id, { page: p, page_size: 10, status: filterStatus || null })
      .then(setData)
      .catch((e) => {
        setError(e?.response?.data?.detail || 'Could not load applicants.')
        setData({ items: [], total: 0, pages: 1, page: 1 })
      })
  }

  useEffect(() => {
    jobsApi.get(id).then(setJob).catch(() => setJob(null))
    // Fetch AI match scores once for this job; map by application_id.
    matchingApi
      .applicantScores(id, { limit: 100 })
      .then((rows) => {
        const map = {}
        for (const r of rows) map[r.application_id] = { score: r.score, has_resume: r.has_resume }
        setScoresByApp(map)
      })
      .catch(() => setScoresByApp({}))
  }, [id])

  useEffect(() => {
    load(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, page, filterStatus])

  const setPage = (p) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('page', String(p))
      return next
    })

  const setStatusFilter = (s) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      s ? next.set('status', s) : next.delete('status')
      next.delete('page')
      return next
    })

  const changeStatus = async (applicationId, status) => {
    setBusyId(applicationId)
    try {
      await jobsApi.updateApplicationStatus(id, applicationId, status)
      await load(page)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Could not update status.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <header className="mb-6">
        <Link to="/dashboard/jobs" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-700">
          <FiArrowLeft /> Posted jobs
        </Link>
        <h1 className="mt-2 text-2xl font-bold">
          Applicants{job && <span className="font-normal text-slate-500"> for {job.title}</span>}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {data ? `${data.total} application${data.total === 1 ? '' : 's'}` : 'Loading…'}
        </p>
      </header>

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        <FilterChip active={!filterStatus} onClick={() => setStatusFilter('')}>All</FilterChip>
        {STATUSES.map((s) => (
          <FilterChip key={s} active={filterStatus === s} onClick={() => setStatusFilter(s)}>
            {s}
          </FilterChip>
        ))}
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</div>}

      {!data && <SkeletonList />}
      {data?.items?.length === 0 && (
        <Empty title="No applicants" message={filterStatus ? `No applicants with status "${filterStatus}".` : 'When candidates apply, they will appear here.'} />
      )}

      {data?.items?.length > 0 && (
        <div className="grid gap-4">
          {data.items.map((a) => (
            <article key={a.id} className="card p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="font-semibold text-slate-900">{a.applicant?.full_name || `User #${a.applicant_id}`}</div>
                  {a.applicant?.email && (
                    <a className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-brand-700" href={`mailto:${a.applicant.email}`}>
                      <FiMail /> {a.applicant.email}
                    </a>
                  )}
                  <div className="mt-1 text-xs text-slate-500">
                    Applied {new Date(a.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {scoresByApp[a.id] && (
                    scoresByApp[a.id].has_resume
                      ? <MatchScore score={scoresByApp[a.id].score} size="sm" />
                      : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 ring-1 ring-slate-200" title="Applicant has no resume on file">no resume</span>
                  )}
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${BADGE[a.status] || 'bg-slate-100'}`}>
                    {a.status}
                  </span>
                  <select
                    className="input py-1 text-xs"
                    value={a.status}
                    disabled={busyId === a.id}
                    onChange={(e) => changeStatus(a.id, e.target.value)}
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              {a.cover_letter && (
                <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-slate-100">
                  <div className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-500">Cover letter</div>
                  <div className="whitespace-pre-line">{a.cover_letter}</div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </div>
  )
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ring-1 transition ${
        active ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
      }`}
    >
      {active && <FiCheck size={12} />} {children}
    </button>
  )
}
