import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FiArrowLeft, FiCheck, FiGlobe, FiMapPin, FiBriefcase, FiUsers } from 'react-icons/fi'
import { companiesApi, jobsApi } from '../services/api.js'
import JobCard from '../components/JobCard.jsx'
import Empty from '../components/Empty.jsx'
import { SkeletonList } from '../components/Skeleton.jsx'

export default function CompanyDetail() {
  const { id } = useParams()
  const [company, setCompany] = useState(null)
  const [jobs, setJobs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([companiesApi.get(id), jobsApi.list({ company_id: id, page_size: 50 })])
      .then(([c, j]) => {
        setCompany(c)
        setJobs(j)
      })
      .catch((e) => setError(e?.response?.data?.detail || 'Company not found.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="mx-auto max-w-4xl px-4 py-12 text-slate-500">Loading…</div>
  if (error)
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="card p-8 text-center text-slate-600">{error}</div>
        <div className="mt-4 text-center">
          <Link to="/companies" className="btn-secondary"><FiArrowLeft /> Back to companies</Link>
        </div>
      </div>
    )

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link to="/companies" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-700">
        <FiArrowLeft /> All companies
      </Link>

      <div className="card mt-4 p-6 sm:p-8">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{company.name}</h1>
          {company.is_verified && <span title="Verified" className="text-brand-600"><FiCheck /></span>}
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
          {company.industry && <Meta icon={FiBriefcase}>{company.industry}</Meta>}
          {company.location && <Meta icon={FiMapPin}>{company.location}</Meta>}
          {company.size_range && <Meta icon={FiUsers}>{company.size_range} employees</Meta>}
          {company.website && (
            <a className="inline-flex items-center gap-1 text-brand-700 hover:underline" href={company.website} target="_blank" rel="noreferrer">
              <FiGlobe /> Website
            </a>
          )}
        </div>

        {company.description && (
          <p className="mt-5 text-sm leading-relaxed text-slate-700">{company.description}</p>
        )}
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Open roles at {company.name}</h2>
        <p className="mt-1 text-sm text-slate-600">{jobs?.total ?? 0} active jobs</p>
        <div className="mt-4">
          {!jobs && <SkeletonList />}
          {jobs?.items?.length === 0 && (
            <Empty title="No openings right now" message="Check back later — this company hires often." />
          )}
          {jobs?.items?.length > 0 && (
            <div className="grid gap-4">
              {jobs.items.map((j) => <JobCard key={j.id} job={j} />)}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function Meta({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="text-slate-400" /> {children}
    </span>
  )
}
