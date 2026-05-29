import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { adminApi } from '../../services/api.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useDebounce } from '../../hooks/useDebounce.js'
import Pagination from '../../components/Pagination.jsx'
import { SkeletonList } from '../../components/Skeleton.jsx'

const ROLES = [
  ['', 'All roles'],
  ['admin', 'Admin'],
  ['employer', 'Employer'],
  ['job_seeker', 'Job seeker'],
]

const ROLE_BADGE = {
  admin: 'bg-amber-50 text-amber-800',
  employer: 'bg-blue-50 text-blue-700',
  job_seeker: 'bg-emerald-50 text-emerald-700',
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const q = searchParams.get('q') || ''
  const role = searchParams.get('role') || ''
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
  const [error, setError] = useState(null)

  const load = (p = page) => {
    setData(null)
    setError(null)
    return adminApi
      .users({ q, role: role || null, page: p, page_size: 20 })
      .then(setData)
      .catch((e) => {
        setError(e?.response?.data?.detail || 'Could not load users.')
        setData({ items: [], total: 0, pages: 1, page: 1 })
      })
  }

  useEffect(() => {
    load(page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, role, page])

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

  const updateUser = async (id, payload) => {
    setBusyId(id)
    setError(null)
    try {
      await adminApi.updateUser(id, payload)
      await load(page)
    } catch (e) {
      setError(e?.response?.data?.detail || 'Could not update user.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="mt-1 text-sm text-slate-600">
          {data ? `${data.total} user${data.total === 1 ? '' : 's'}` : 'Loading…'}
        </p>
      </header>

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input className="input" placeholder="Search by name or email" value={input} onChange={(e) => setInput(e.target.value)} />
        <select className="input" value={role} onChange={(e) => setFilter('role', e.target.value)}>
          {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</div>}
      {!data && <SkeletonList />}

      {data?.items?.length > 0 && (
        <div className="overflow-x-auto card">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((u) => {
                const isMe = u.id === currentUser.id
                return (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{u.full_name}{isMe && <span className="ml-2 text-xs text-slate-400">(you)</span>}</td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <select
                        disabled={isMe || busyId === u.id}
                        value={u.role}
                        onChange={(e) => updateUser(u.id, { role: e.target.value })}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-transparent ${ROLE_BADGE[u.role] || ''}`}
                      >
                        <option value="admin">admin</option>
                        <option value="employer">employer</option>
                        <option value="job_seeker">job_seeker</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {u.is_active ? 'active' : 'disabled'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => updateUser(u.id, { is_active: !u.is_active })}
                        disabled={isMe || busyId === u.id}
                        className="btn-secondary px-2 py-1 text-xs"
                      >
                        {u.is_active ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && <Pagination page={data.page} pages={data.pages} onChange={setPage} />}
    </div>
  )
}
