import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FiTrash2, FiEyeOff, FiEye } from 'react-icons/fi'
import { adminApi } from '../../services/api.js'
import { useDebounce } from '../../hooks/useDebounce.js'
import Pagination from '../../components/Pagination.jsx'
import { SkeletonList } from '../../components/Skeleton.jsx'

const ACTIVE_OPTIONS = [
  ['', 'All jobs'],
  ['true', 'Active'],
  ['false', 'Inactive'],
]

export default function AdminJobs() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const active = searchParams.get('is_active') || ''
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
  const [busyId, setBusyId] = useState(null)

  const load = (p = page) => {
    setData(null)
    return adminApi
      .jobs({ q, is_active: active === '' ? null : active === 'true', page: p, page_size: 20 })
      .then(setData)
      .catch(() => setData({ items: [], total: 0, pages: 1, page: 1 }))
  }

  useEffect(() => {
    load(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, active, page])

  const setFilter = (key, value) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      value ? next.set(key, value) : next.delete(key)
      next.delete('page')
      return next
    })

  const setPage = (p) =>
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('page', String(p))
      return next
    })

  const toggleActive = async (j) => {
    setBusyId(j.id)
    try {
      await adminApi.setJobActive(j.id, !j.is_active)
      await load(page)
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (j) => {
    if (!window.confirm(`Permanently delete "${j.title}"? Applications will be removed too.`)) return
    setBusyId(j.id)
    try {
      await adminApi.deleteJob(j.id)
      await load(page)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Job moderation</h1>
        <p className="mt-1 text-sm text-slate-600">
          {data ? `${data.total} job${data.total === 1 ? '' : 's'} on the platform` : 'Loading…'}
        </p>
      </header>

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input className="input" placeholder="Search title or description" value={input} onChange={(e) => setInput(e.target.value)} />
        <select className="input" value={active} onChange={(e) => setFilter('is_active', e.target.value)}>
          {ACTIVE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {!data && <SkeletonList count={4} />}

      {data?.items?.length > 0 && (
        <div className="grid gap-3">
          {data.items.map((j) => (
            <article key={j.id} className={`card flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between ${!j.is_active ? 'opacity-70' : ''}`}>
              <div>
                <Link to={`/jobs/${j.id}`} className="font-semibold text-slate-900 hover:text-brand-700">{j.title}</Link>
                <div className="mt-0.5 text-xs text-slate-500">
                  {j.company?.name || `Company #${j.company_id}`} • posted {new Date(j.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`self-center rounded-full px-2 py-0.5 text-xs ${j.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                  {j.is_active ? 'active' : 'inactive'}
                </span>
                <button onClick={() => toggleActive(j)} disabled={busyId === j.id} className="btn-secondary text-xs">
                  {j.is_active ? <><FiEyeOff/> Deactivate</> : <><FiEye/> Activate</>}
                </button>
                <button onClick={() => remove(j)} disabled={busyId === j.id} className="btn-secondary text-xs text-red-700 hover:bg-red-50">
                  <FiTrash2 />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </div>
  )
}
