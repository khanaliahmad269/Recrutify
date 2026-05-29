import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FiEdit2, FiTrash2, FiUsers, FiPlus, FiAlertCircle } from 'react-icons/fi'
import { jobsApi } from '../../services/api.js'
import Pagination from '../../components/Pagination.jsx'
import Empty from '../../components/Empty.jsx'
import { SkeletonList } from '../../components/Skeleton.jsx'

export default function MyJobs() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get('page') || 1)
  const [data, setData] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [err, setErr] = useState(null)

  const load = (p = page) => {
    setData(null)
    setErr(null)
    return jobsApi
      .myPostedJobs({ page: p, page_size: 10 })
      .then(setData)
      .catch((e) => {
        setData({ items: [], total: 0, pages: 1, page: 1 })
        if (e?.response?.status === 400) {
          setErr('no_company')
        } else {
          setErr(e?.response?.data?.detail || 'Could not load jobs.')
        }
      })
  }

  useEffect(() => {
    load(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const setPage = (p) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('page', String(p))
      return next
    })

  const onDelete = async (jobId) => {
    if (!window.confirm('Delete this job? Applications attached to it will be removed too.')) return
    setBusyId(jobId)
    try {
      await jobsApi.remove(jobId)
      await load(page)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <header className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Posted jobs</h1>
          <p className="mt-1 text-sm text-slate-600">
            {data ? `${data.total} role${data.total === 1 ? '' : 's'} on your company page` : 'Loading…'}
          </p>
        </div>
        <Link to="/dashboard/jobs/new" className="btn-primary">
          <FiPlus /> Post a job
        </Link>
      </header>

      {err && err !== 'no_company' && (
        <div className="card mb-4 flex items-center gap-2 p-4 text-sm text-red-700">
          <FiAlertCircle /> {err}
        </div>
      )}

      {!data && <SkeletonList />}

      {data?.items?.length === 0 && (
        <Empty
          title="No jobs posted yet"
          message="Create your first listing to start receiving applications."
          action={<Link to="/dashboard/jobs/new" className="btn-primary mt-3">Post a job</Link>}
        />
      )}

      {data?.items?.length > 0 && (
        <div className="grid gap-4">
          {data.items.map((j) => (
            <article key={j.id} className={`card p-5 ${!j.is_active ? 'opacity-70' : ''}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Link to={`/jobs/${j.id}`} className="text-lg font-semibold text-slate-900 hover:text-brand-700">
                      {j.title}
                    </Link>
                    {!j.is_active && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">Inactive</span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Posted {new Date(j.created_at).toLocaleDateString()} • {j.is_remote ? 'Remote' : j.location || 'On-site'} •{' '}
                    {labelEmployment(j.employment_type)}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/dashboard/jobs/${j.id}/applicants`} className="btn-secondary">
                    <FiUsers /> {j.application_count} applicant{j.application_count === 1 ? '' : 's'}
                    {j.pending_count > 0 && (
                      <span className="ml-1 rounded-full bg-amber-100 px-1.5 text-xs text-amber-800">{j.pending_count} new</span>
                    )}
                  </Link>
                  <Link to={`/dashboard/jobs/${j.id}/edit`} className="btn-secondary">
                    <FiEdit2 /> Edit
                  </Link>
                  <button
                    onClick={() => onDelete(j.id)}
                    disabled={busyId === j.id}
                    className="btn-secondary text-red-700 hover:bg-red-50"
                    title="Delete job"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </div>
  )
}

function labelEmployment(t) {
  return { full_time: 'Full-time', part_time: 'Part-time', contract: 'Contract', internship: 'Internship', temporary: 'Temporary' }[t] || t
}
