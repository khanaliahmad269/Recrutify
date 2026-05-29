import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FiCheck, FiX, FiMapPin } from 'react-icons/fi'
import { adminApi } from '../../services/api.js'
import { useDebounce } from '../../hooks/useDebounce.js'
import Pagination from '../../components/Pagination.jsx'
import { SkeletonList } from '../../components/Skeleton.jsx'

const VERIFIED_OPTIONS = [
  ['', 'All companies'],
  ['true', 'Verified'],
  ['false', 'Unverified'],
]

export default function AdminCompanies() {
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const verified = searchParams.get('is_verified') || ''
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
      .companies({ q, is_verified: verified === '' ? null : verified === 'true', page: p, page_size: 20 })
      .then(setData)
      .catch(() => setData({ items: [], total: 0, pages: 1, page: 1 }))
  }

  useEffect(() => {
    load(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, verified, page])

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

  const toggleVerify = async (c) => {
    setBusyId(c.id)
    try {
      await adminApi.verifyCompany(c.id, !c.is_verified)
      await load(page)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Companies</h1>
        <p className="mt-1 text-sm text-slate-600">
          {data ? `${data.total} compan${data.total === 1 ? 'y' : 'ies'}` : 'Loading…'}
        </p>
      </header>

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input className="input" placeholder="Search by name or industry" value={input} onChange={(e) => setInput(e.target.value)} />
        <select className="input" value={verified} onChange={(e) => setFilter('is_verified', e.target.value)}>
          {VERIFIED_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {!data && <SkeletonList count={4} />}

      {data?.items?.length > 0 && (
        <div className="grid gap-4">
          {data.items.map((c) => (
            <article key={c.id} className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Link to={`/companies/${c.id}`} className="text-lg font-semibold text-slate-900 hover:text-brand-700">{c.name}</Link>
                  {c.is_verified && <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"><FiCheck size={12}/> verified</span>}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                  {c.industry && <span>{c.industry}</span>}
                  {c.location && <span className="inline-flex items-center gap-1"><FiMapPin size={12}/>{c.location}</span>}
                  {c.size_range && <span>{c.size_range} employees</span>}
                </div>
                {c.description && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{c.description}</p>}
              </div>
              <button onClick={() => toggleVerify(c)} disabled={busyId === c.id} className={c.is_verified ? 'btn-secondary' : 'btn-primary'}>
                {c.is_verified ? <><FiX/> Unverify</> : <><FiCheck/> Verify</>}
              </button>
            </article>
          ))}
        </div>
      )}

      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </div>
  )
}
