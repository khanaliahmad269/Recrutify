import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FiTrash2 } from 'react-icons/fi'
import { meApi } from '../../services/api.js'
import JobCard from '../../components/JobCard.jsx'
import Pagination from '../../components/Pagination.jsx'
import Empty from '../../components/Empty.jsx'
import { SkeletonList } from '../../components/Skeleton.jsx'

export default function SavedJobs() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get('page') || 1)
  const [data, setData] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = (p = page) => {
    setData(null)
    return meApi
      .savedJobs({ page: p, page_size: 10 })
      .then(setData)
      .catch(() => setData({ items: [], total: 0, pages: 1, page: 1 }))
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

  const onUnsave = async (jobId) => {
    setBusyId(jobId)
    try {
      await meApi.unsave(jobId)
      await load(page)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Saved jobs</h1>
        <p className="mt-1 text-sm text-slate-600">
          {data ? `${data.total} bookmarked role${data.total === 1 ? '' : 's'}` : 'Loading…'}
        </p>
      </header>

      {!data && <SkeletonList />}
      {data?.items?.length === 0 && (
        <Empty
          title="No saved jobs"
          message="Bookmark jobs from the listings to revisit them later."
          action={<Link to="/jobs" className="btn-primary mt-3">Browse jobs</Link>}
        />
      )}

      {data?.items?.length > 0 && (
        <div className="grid gap-4">
          {data.items.map((s) =>
            s.job ? (
              <JobCard
                key={s.id}
                job={s.job}
                action={
                  <button
                    onClick={() => onUnsave(s.job_id)}
                    disabled={busyId === s.job_id}
                    className="btn-secondary text-red-700 hover:bg-red-50"
                  >
                    <FiTrash2 /> Remove
                  </button>
                }
              />
            ) : (
              <div key={s.id} className="card p-4 text-sm text-slate-500">
                Job #{s.job_id} (no longer available)
              </div>
            ),
          )}
        </div>
      )}

      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </div>
  )
}
