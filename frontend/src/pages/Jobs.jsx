import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { jobsApi } from '../services/api.js'
import { useDebounce } from '../hooks/useDebounce.js'
import JobCard from '../components/JobCard.jsx'
import Pagination from '../components/Pagination.jsx'
import Empty from '../components/Empty.jsx'
import { SkeletonList } from '../components/Skeleton.jsx'

const EMPLOYMENT_TYPES = [
  ['', 'Any type'],
  ['full_time', 'Full-time'],
  ['part_time', 'Part-time'],
  ['contract', 'Contract'],
  ['internship', 'Internship'],
  ['temporary', 'Temporary'],
]
const EXPERIENCE_LEVELS = [
  ['', 'Any level'],
  ['entry', 'Entry'],
  ['mid', 'Mid'],
  ['senior', 'Senior'],
  ['lead', 'Lead'],
]
const SORTS = [
  ['recent', 'Most recent'],
  ['salary_desc', 'Salary: high to low'],
  ['salary_asc', 'Salary: low to high'],
]

export default function Jobs() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo(
    () => ({
      q: searchParams.get('q') || '',
      location: searchParams.get('location') || '',
      employment_type: searchParams.get('employment_type') || '',
      experience_level: searchParams.get('experience_level') || '',
      is_remote: searchParams.get('is_remote') || '',
      sort: searchParams.get('sort') || 'recent',
      page: Number(searchParams.get('page') || 1),
    }),
    [searchParams],
  )

  // Local input state so typing doesn't fire a request on every keystroke.
  const [queryInput, setQueryInput] = useState(filters.q)
  const [locationInput, setLocationInput] = useState(filters.location)
  const debouncedQuery = useDebounce(queryInput, 300)
  const debouncedLocation = useDebounce(locationInput, 300)

  // Push the debounced inputs into the URL.
  useEffect(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        debouncedQuery ? next.set('q', debouncedQuery) : next.delete('q')
        debouncedLocation ? next.set('location', debouncedLocation) : next.delete('location')
        // Reset to page 1 whenever the query/location changes.
        if (next.get('q') !== prev.get('q') || next.get('location') !== prev.get('location')) {
          next.delete('page')
        }
        return next
      },
      { replace: true },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, debouncedLocation])

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    jobsApi
      .list({
        q: filters.q,
        location: filters.location,
        employment_type: filters.employment_type,
        experience_level: filters.experience_level,
        is_remote: filters.is_remote === '' ? null : filters.is_remote === 'true',
        sort: filters.sort,
        page: filters.page,
        page_size: 10,
      })
      .then((res) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError(err?.response?.data?.detail || 'Failed to load jobs.'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [filters.q, filters.location, filters.employment_type, filters.experience_level, filters.is_remote, filters.sort, filters.page])

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Browse jobs</h1>
          <p className="mt-1 text-sm text-slate-600">
            {loading ? 'Loading…' : `${data?.total ?? 0} roles matching your filters`}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-2 rounded-xl bg-white p-3 shadow-card ring-1 ring-slate-100 sm:grid-cols-2 lg:grid-cols-3">
        <input
          className="input"
          placeholder="Title, keyword, or company"
          value={queryInput}
          onChange={(e) => setQueryInput(e.target.value)}
        />
        <input
          className="input"
          placeholder="Location"
          value={locationInput}
          onChange={(e) => setLocationInput(e.target.value)}
        />
        <select
          className="input"
          value={filters.is_remote}
          onChange={(e) => setFilter('is_remote', e.target.value)}
        >
          <option value="">Remote or onsite</option>
          <option value="true">Remote only</option>
          <option value="false">Onsite only</option>
        </select>
        <select
          className="input"
          value={filters.employment_type}
          onChange={(e) => setFilter('employment_type', e.target.value)}
        >
          {EMPLOYMENT_TYPES.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select
          className="input"
          value={filters.experience_level}
          onChange={(e) => setFilter('experience_level', e.target.value)}
        >
          {EXPERIENCE_LEVELS.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select className="input" value={filters.sort} onChange={(e) => setFilter('sort', e.target.value)}>
          {SORTS.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      <div className="mt-6">
        {loading && <SkeletonList />}
        {error && !loading && (
          <Empty title="Couldn't load jobs" message={error} />
        )}
        {!loading && !error && data?.items?.length === 0 && (
          <Empty title="No jobs matched" message="Try widening your filters or clearing the search." />
        )}
        {!loading && !error && data?.items?.length > 0 && (
          <div className="grid gap-4">
            {data.items.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>

      {data && (
        <Pagination page={data.page} pages={data.pages} onChange={setPage} />
      )}
    </div>
  )
}
