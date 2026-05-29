import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FiMapPin, FiBriefcase, FiDollarSign, FiClock, FiArrowLeft, FiBookmark, FiCheck } from 'react-icons/fi'
import { jobsApi, meApi } from '../services/api.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function JobDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Action state
  const [coverLetter, setCoverLetter] = useState('')
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savingBusy, setSavingBusy] = useState(false)
  const [actionError, setActionError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    jobsApi
      .get(id)
      .then(setJob)
      .catch((e) => setError(e?.response?.data?.detail || 'Job not found.'))
      .finally(() => setLoading(false))
  }, [id])

  // Detect existing application / saved state for the current job seeker.
  useEffect(() => {
    if (!user || user.role !== 'job_seeker' || !job) return
    Promise.all([
      meApi.applications({ page: 1, page_size: 100 }).catch(() => ({ items: [] })),
      meApi.savedJobs({ page: 1, page_size: 100 }).catch(() => ({ items: [] })),
    ]).then(([apps, savedRes]) => {
      setApplied(apps.items?.some((a) => a.job_id === job.id))
      setSaved(savedRes.items?.some((s) => s.job_id === job.id))
    })
  }, [user, job])

  if (loading) return <div className="mx-auto max-w-4xl px-4 py-12 text-slate-500">Loading…</div>
  if (error)
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="card p-8 text-center text-slate-600">{error}</div>
        <div className="mt-4 text-center">
          <Link to="/jobs" className="btn-secondary"><FiArrowLeft /> Back to jobs</Link>
        </div>
      </div>
    )
  if (!job) return null

  const salary = formatSalary(job)
  const company = job.company

  const onApply = async () => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/jobs/${id}` } } })
      return
    }
    setActionError(null)
    setApplying(true)
    try {
      await jobsApi.apply(id, { cover_letter: coverLetter || null })
      setApplied(true)
      setCoverLetter('')
    } catch (e) {
      setActionError(e?.response?.data?.detail || 'Could not submit application.')
    } finally {
      setApplying(false)
    }
  }

  const onToggleSave = async () => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/jobs/${id}` } } })
      return
    }
    setActionError(null)
    setSavingBusy(true)
    try {
      if (saved) {
        await meApi.unsave(id)
        setSaved(false)
      } else {
        await meApi.save(id)
        setSaved(true)
      }
    } catch (e) {
      setActionError(e?.response?.data?.detail || 'Could not update saved jobs.')
    } finally {
      setSavingBusy(false)
    }
  }

  const isSeeker = user?.role === 'job_seeker'
  const isAnonymous = !user

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-700">
        <FiArrowLeft /> All jobs
      </Link>

      <div className="card mt-4 p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{job.title}</h1>
            {company && (
              <Link to={`/companies/${company.id}`} className="mt-1 inline-block text-sm font-medium text-brand-700 hover:underline">
                {company.name}
              </Link>
            )}
          </div>
          {(isSeeker || isAnonymous) && (
            <button
              onClick={onToggleSave}
              disabled={savingBusy}
              className={saved ? 'btn-primary' : 'btn-secondary'}
              title={saved ? 'Unsave' : 'Save for later'}
            >
              <FiBookmark /> {saved ? 'Saved' : 'Save'}
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
          <Meta icon={FiMapPin}>{job.is_remote ? 'Remote' : job.location || '—'}</Meta>
          <Meta icon={FiBriefcase}>{labelEmployment(job.employment_type)} • {labelExperience(job.experience_level)}</Meta>
          {salary && <Meta icon={FiDollarSign}>{salary}</Meta>}
          <Meta icon={FiClock}>Posted {formatPosted(job.created_at)}</Meta>
          {job.category && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs">{job.category}</span>}
        </div>

        <Section title="Job description">
          <Paragraphs text={job.description} />
        </Section>
        {job.requirements && (
          <Section title="Requirements">
            <Paragraphs text={job.requirements} />
          </Section>
        )}

        {company && (
          <Section title={`About ${company.name}`}>
            <p className="text-sm text-slate-600">{company.description || 'No description provided.'}</p>
          </Section>
        )}

        {/* Apply panel */}
        <div className="mt-8 border-t border-slate-100 pt-6">
          {isAnonymous && (
            <div className="rounded-lg bg-brand-50 p-4 text-sm text-brand-800">
              <Link to="/login" state={{ from: { pathname: `/jobs/${id}` } }} className="font-semibold underline">
                Log in
              </Link>{' '}
              or{' '}
              <Link to="/register" className="font-semibold underline">create an account</Link>{' '}
              to apply.
            </div>
          )}
          {isSeeker && (
            <>
              {actionError && (
                <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{actionError}</div>
              )}
              {applied ? (
                <div className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">
                  <FiCheck /> Application submitted — track progress in your dashboard.
                </div>
              ) : (
                <div className="grid gap-3">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Cover letter (optional)</span>
                    <textarea
                      className="input min-h-[120px]"
                      placeholder="Tell the team why you're a great fit…"
                      value={coverLetter}
                      onChange={(e) => setCoverLetter(e.target.value)}
                    />
                  </label>
                  <button onClick={onApply} disabled={applying} className="btn-primary self-start">
                    {applying ? 'Submitting…' : 'Apply now'}
                  </button>
                </div>
              )}
            </>
          )}
          {user && user.role !== 'job_seeker' && (
            <div className="text-sm text-slate-500">
              You're signed in as <span className="font-medium">{user.role.replace('_', ' ')}</span> — only job seekers can apply.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="mt-6">
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      <div className="mt-2 text-sm leading-relaxed text-slate-700">{children}</div>
    </section>
  )
}

function Paragraphs({ text }) {
  return text.split(/\n\s*\n/).map((p, i) => (
    <p key={i} className="mb-3 last:mb-0 whitespace-pre-line">{p}</p>
  ))
}

function Meta({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="text-slate-400" /> {children}
    </span>
  )
}

function labelEmployment(t) {
  return { full_time: 'Full-time', part_time: 'Part-time', contract: 'Contract', internship: 'Internship', temporary: 'Temporary' }[t] || t
}
function labelExperience(l) {
  return { entry: 'Entry-level', mid: 'Mid-level', senior: 'Senior', lead: 'Lead' }[l] || l
}
function formatSalary(j) {
  if (j.salary_min == null && j.salary_max == null) return null
  const cur = j.currency || 'USD'
  const fmt = (n) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
  if (j.salary_min != null && j.salary_max != null) return `${cur} ${fmt(j.salary_min)}–${fmt(j.salary_max)}`
  return `${cur} ${fmt(j.salary_min ?? j.salary_max)}+`
}
function formatPosted(iso) {
  if (!iso) return 'recently'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return `${Math.floor(days / 30)} months ago`
}
