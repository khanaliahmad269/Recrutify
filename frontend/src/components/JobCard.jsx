import { Link } from 'react-router-dom'
import { FiMapPin, FiBriefcase, FiClock, FiDollarSign } from 'react-icons/fi'

const EMPLOYMENT_LABEL = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
  temporary: 'Temporary',
}

export default function JobCard({ job, action }) {
  const company = job.company?.name
  const salary = formatSalary(job)
  const posted = formatPosted(job.created_at)

  return (
    <article className="card p-5 transition hover:shadow-elevated">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            <Link to={`/jobs/${job.id}`} className="hover:text-brand-700">{job.title}</Link>
          </h2>
          {company && <div className="mt-1 text-sm text-slate-600">{company}</div>}
        </div>
        {posted && (
          <span className="inline-flex items-center gap-1 self-start rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
            <FiClock size={12} /> {posted}
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
        <Meta icon={FiMapPin}>{job.is_remote ? 'Remote' : job.location || '—'}</Meta>
        <Meta icon={FiBriefcase}>{EMPLOYMENT_LABEL[job.employment_type] || job.employment_type}</Meta>
        {salary && <Meta icon={FiDollarSign}>{salary}</Meta>}
      </div>

      {job.category && (
        <div className="mt-3">
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">{job.category}</span>
        </div>
      )}

      {action && <div className="mt-4">{action}</div>}
    </article>
  )
}

function Meta({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="text-slate-400" /> {children}
    </span>
  )
}

function formatSalary(j) {
  if (j.salary_min == null && j.salary_max == null) return null
  const cur = j.currency || 'USD'
  const fmt = (n) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
  if (j.salary_min != null && j.salary_max != null) return `${cur} ${fmt(j.salary_min)}–${fmt(j.salary_max)}`
  return `${cur} ${fmt(j.salary_min ?? j.salary_max)}+`
}

function formatPosted(iso) {
  if (!iso) return null
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return '1d ago'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}
