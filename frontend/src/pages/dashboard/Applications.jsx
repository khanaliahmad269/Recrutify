import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { meApi } from '../../services/api.js'
import Pagination from '../../components/Pagination.jsx'
import Empty from '../../components/Empty.jsx'
import { SkeletonList } from '../../components/Skeleton.jsx'

const STATUS_BADGE = {
  pending: 'bg-slate-100 text-slate-700',
  reviewed: 'bg-blue-50 text-blue-700',
  shortlisted: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  hired: 'bg-amber-50 text-amber-800',
}

export default function Applications() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get('page') || 1)
  const [data, setData] = useState(null)

  useEffect(() => {
    let cancelled = false
    setData(null)
    meApi
      .applications({ page, page_size: 10 })
      .then((r) => !cancelled && setData(r))
      .catch(() => !cancelled && setData({ items: [], total: 0, pages: 1, page: 1 }))
    return () => {
      cancelled = true
    }
  }, [page])

  const setPage = (p) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('page', String(p))
      return next
    })

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold">My applications</h1>
        <p className="mt-1 text-sm text-slate-600">
          {data ? `${data.total} application${data.total === 1 ? '' : 's'} submitted` : 'Loading…'}
        </p>
      </header>

      {!data && <SkeletonList />}
      {data?.items?.length === 0 && (
        <Empty
          title="No applications yet"
          message="Apply to jobs from the listings page to track them here."
          action={<Link to="/jobs" className="btn-primary mt-3">Browse jobs</Link>}
        />
      )}

      {data?.items?.length > 0 && (
        <div className="grid gap-4">
          {data.items.map((a) => (
            <article key={a.id} className="card p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Link
                    to={`/jobs/${a.job_id}`}
                    className="text-lg font-semibold text-slate-900 hover:text-brand-700"
                  >
                    {a.job?.title || `Job #${a.job_id}`}
                  </Link>
                  <div className="mt-1 text-xs text-slate-500">
                    Applied {new Date(a.created_at).toLocaleDateString()} • Last update{' '}
                    {new Date(a.updated_at).toLocaleDateString()}
                  </div>
                </div>
                <span
                  className={`self-start rounded-full px-3 py-1 text-xs font-medium ${
                    STATUS_BADGE[a.status] || 'bg-slate-100'
                  }`}
                >
                  {a.status}
                </span>
              </div>
              {a.cover_letter && (
                <p className="mt-3 line-clamp-3 text-sm text-slate-600">{a.cover_letter}</p>
              )}
            </article>
          ))}
        </div>
      )}

      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </div>
  )
}
