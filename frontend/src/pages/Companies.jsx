import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FiMapPin, FiBriefcase, FiCheck } from 'react-icons/fi'
import { companiesApi } from '../services/api.js'
import { useDebounce } from '../hooks/useDebounce.js'
import Pagination from '../components/Pagination.jsx'
import Empty from '../components/Empty.jsx'
import { SkeletonList } from '../components/Skeleton.jsx'

export default function Companies() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const page = Number(searchParams.get('page') || 1)

  const [input, setInput] = useState(q)
  const debounced = useDebounce(input, 300)

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        debounced ? next.set('q', debounced) : next.delete('q')
        if (next.get('q') !== prev.get('q')) next.delete('page')
        return next
      },
      { replace: true },
    )
  }, [debounced, setSearchParams])

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    companiesApi
      .list({ q, page, page_size: 12 })
      .then((r) => !cancelled && setData(r))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [q, page])

  const setPage = (p) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('page', String(p))
      return next
    })

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Companies hiring on Recrutify</h1>
      <p className="mt-1 text-sm text-slate-600">
        {loading ? 'Loading…' : `${data?.total ?? 0} companies`}
      </p>

      <div className="mt-6">
        <input
          className="input max-w-md"
          placeholder="Search by name or industry…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </div>

      <div className="mt-6">
        {loading && <SkeletonList count={6} />}
        {!loading && data?.items?.length === 0 && (
          <Empty title="No companies found" message="Try a different search term." />
        )}
        {!loading && data?.items?.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((c) => (
              <Link
                key={c.id}
                to={`/companies/${c.id}`}
                className="card p-5 transition hover:shadow-elevated"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-900">{c.name}</h2>
                      {c.is_verified && (
                        <span title="Verified" className="text-brand-600"><FiCheck /></span>
                      )}
                    </div>
                    {c.industry && (
                      <div className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                        <FiBriefcase /> {c.industry}
                      </div>
                    )}
                  </div>
                </div>
                {c.description && (
                  <p className="mt-3 line-clamp-3 text-sm text-slate-600">{c.description}</p>
                )}
                {c.location && (
                  <div className="mt-3 inline-flex items-center gap-1 text-xs text-slate-500">
                    <FiMapPin /> {c.location}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </div>
  )
}
