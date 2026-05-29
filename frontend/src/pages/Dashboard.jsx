import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiBookmark, FiBriefcase, FiSend, FiUsers, FiFileText, FiZap, FiCheckCircle } from 'react-icons/fi'
import { useAuth } from '../context/AuthContext.jsx'
import { adminApi, companiesApi, jobsApi, meApi } from '../services/api.js'
import JobCard from '../components/JobCard.jsx'
import Empty from '../components/Empty.jsx'
import { SkeletonList } from '../components/Skeleton.jsx'

const APP_STATUS_BADGE = {
  pending: 'bg-slate-100 text-slate-700',
  reviewed: 'bg-blue-50 text-blue-700',
  shortlisted: 'bg-emerald-50 text-emerald-700',
  rejected: 'bg-red-50 text-red-700',
  hired: 'bg-amber-50 text-amber-800',
}

export default function Dashboard() {
  const { user } = useAuth()

  return (
    <div className="grid gap-8">
      <header>
        <h1 className="text-2xl font-bold">Welcome back, {user.full_name}</h1>
        <p className="mt-1 text-sm text-slate-600">
          Signed in as <span className="font-medium text-brand-700">{user.role.replace('_', ' ')}</span>.
        </p>
      </header>

      {user.role === 'job_seeker' && <SeekerDashboard />}
      {user.role === 'employer' && <EmployerDashboard />}
      {user.role === 'admin' && <AdminDashboard />}
    </div>
  )
}

// --- Job seeker ---

function SeekerDashboard() {
  const [applications, setApplications] = useState(null)
  const [saved, setSaved] = useState(null)
  const [hasResume, setHasResume] = useState(null)

  useEffect(() => {
    meApi.applications({ page_size: 10 }).then(setApplications).catch(() => setApplications({ items: [], total: 0 }))
    meApi.savedJobs({ page_size: 10 }).then(setSaved).catch(() => setSaved({ items: [], total: 0 }))
    meApi.getResume().then(() => setHasResume(true)).catch(() => setHasResume(false))
  }, [])

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <StatCard icon={FiSend} label="Applications submitted" value={applications?.total} />
      <StatCard icon={FiBookmark} label="Saved jobs" value={saved?.total} />
      <StatCard
        icon={FiFileText}
        label="Resume"
        value={hasResume == null ? '—' : hasResume ? 'On file' : 'Not yet'}
        hint={hasResume === false ? <Link to="/dashboard/resume" className="text-brand-700 hover:underline">Add yours</Link> : null}
      />

      <section className="lg:col-span-2">
        <h2 className="text-lg font-semibold">Recent applications</h2>
        <div className="mt-3 space-y-3">
          {applications == null && <SkeletonList count={3} />}
          {applications?.items?.length === 0 && (
            <Empty
              title="No applications yet"
              message="Browse open roles and apply to see them here."
              action={<Link to="/jobs" className="btn-primary mt-3">Find jobs</Link>}
            />
          )}
          {applications?.items?.map((a) => (
            <div key={a.id} className="card flex items-center justify-between gap-3 p-4">
              <div>
                <Link to={`/jobs/${a.job_id}`} className="font-medium text-slate-900 hover:text-brand-700">
                  {a.job?.title || `Job #${a.job_id}`}
                </Link>
                <div className="text-xs text-slate-500">Applied {new Date(a.created_at).toLocaleDateString()}</div>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${APP_STATUS_BADGE[a.status] || 'bg-slate-100'}`}>
                {a.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Saved jobs</h2>
        <div className="mt-3 space-y-3">
          {saved == null && <SkeletonList count={2} />}
          {saved?.items?.length === 0 && (
            <Empty title="Nothing saved" message="Bookmark roles to revisit later." />
          )}
          {saved?.items?.map((s) => (
            <div key={s.id} className="card p-4">
              <Link to={`/jobs/${s.job_id}`} className="font-medium text-slate-900 hover:text-brand-700">
                {s.job?.title || `Job #${s.job_id}`}
              </Link>
              <div className="mt-1 text-xs text-slate-500">
                Saved {new Date(s.created_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

// --- Employer ---

function EmployerDashboard() {
  const [company, setCompany] = useState(null)
  const [companyMissing, setCompanyMissing] = useState(false)
  const [companyError, setCompanyError] = useState(null)
  const [jobs, setJobs] = useState(null)

  useEffect(() => {
    companiesApi
      .myOwned()
      .then(async (c) => {
        setCompany(c)
        const j = await jobsApi.myPostedJobs({ page_size: 5 })
        setJobs(j)
      })
      .catch((e) => {
        if (e?.response?.status === 404) setCompanyMissing(true)
        else setCompanyError(e?.response?.data?.detail || 'Could not load your company.')
      })
  }, [])

  if (companyMissing) {
    return (
      <Empty
        title="Set up your company profile"
        message="Create a company before posting jobs."
        action={<Link to="/dashboard/company" className="btn-primary mt-3">Create company</Link>}
      />
    )
  }
  if (companyError) return <Empty title="Couldn't load dashboard" message={companyError} />
  if (!company) return <SkeletonList count={2} />

  const totalApps = jobs?.items?.reduce((s, j) => s + (j.application_count || 0), 0) ?? 0
  const totalPending = jobs?.items?.reduce((s, j) => s + (j.pending_count || 0), 0) ?? 0
  const activeJobs = jobs?.items?.filter((j) => j.is_active).length ?? 0

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <StatCard icon={FiBriefcase} label="Active jobs" value={activeJobs} hint={`${jobs?.total ?? 0} total posted`} />
      <StatCard icon={FiUsers} label="Total applications" value={totalApps} hint={totalPending > 0 ? `${totalPending} pending review` : null} />
      <StatCard
        icon={FiSend}
        label="Quick actions"
        value=" "
        hint={
          <span className="flex gap-3">
            <Link to="/dashboard/jobs/new" className="text-brand-700 hover:underline">+ Post a job</Link>
            <Link to="/dashboard/company" className="text-brand-700 hover:underline">Edit company</Link>
          </span>
        }
      />

      <section className="lg:col-span-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent jobs at {company.name}</h2>
          <Link to="/dashboard/jobs" className="text-sm text-brand-700 hover:underline">All posted jobs →</Link>
        </div>
        <div className="mt-3 grid gap-4">
          {jobs == null && <SkeletonList />}
          {jobs?.items?.length === 0 && (
            <Empty
              title="No jobs posted yet"
              message="Publish your first listing to start receiving applications."
              action={<Link to="/dashboard/jobs/new" className="btn-primary mt-3">Post a job</Link>}
            />
          )}
          {jobs?.items?.map((j) => <JobCard key={j.id} job={j} />)}
        </div>
      </section>
    </div>
  )
}

// --- Admin ---

function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    adminApi.stats().then(setStats).catch((e) => setError(e?.response?.data?.detail || 'Could not load stats.'))
  }, [])

  if (error) return <Empty title="Couldn't load admin stats" message={error} />
  if (!stats) return <SkeletonList count={3} />

  const byStatus = stats.applications_by_status || {}

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={FiUsers} label="Users" value={stats.total_users} hint={`${stats.seekers} seekers · ${stats.employers} employers · ${stats.admins} admins`} />
        <StatCard icon={FiBriefcase} label="Companies" value={stats.total_companies} hint={`${stats.verified_companies} verified`} />
        <StatCard icon={FiFileText} label="Jobs" value={stats.total_jobs} hint={`${stats.active_jobs} active`} />
        <StatCard icon={FiSend} label="Applications" value={stats.total_applications} hint={`${byStatus.pending || 0} pending · ${byStatus.hired || 0} hired`} />
      </div>

      <section className="card p-6">
        <h2 className="text-base font-semibold text-slate-800">Applications by status</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-5">
          {Object.entries(byStatus).map(([s, n]) => (
            <div key={s} className="rounded-lg border border-slate-100 p-3 text-center">
              <div className="text-2xl font-bold text-slate-900">{n}</div>
              <div className="mt-1 text-xs uppercase tracking-wider text-slate-500">{s}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link to="/dashboard/admin/users" className="card p-5 transition hover:shadow-elevated">
          <FiUsers className="text-brand-600" size={20} />
          <div className="mt-2 font-semibold">Manage users</div>
          <div className="mt-1 text-xs text-slate-500">Search, change roles, enable/disable accounts</div>
        </Link>
        <Link to="/dashboard/admin/companies" className="card p-5 transition hover:shadow-elevated">
          <FiCheckCircle className="text-brand-600" size={20} />
          <div className="mt-2 font-semibold">Verify companies</div>
          <div className="mt-1 text-xs text-slate-500">Approve company profiles for the public site</div>
        </Link>
        <Link to="/dashboard/admin/jobs" className="card p-5 transition hover:shadow-elevated">
          <FiZap className="text-brand-600" size={20} />
          <div className="mt-2 font-semibold">Moderate jobs</div>
          <div className="mt-1 text-xs text-slate-500">Deactivate or delete listings</div>
        </Link>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, hint }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-slate-500">{label}</span>
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-600">
          <Icon />
        </span>
      </div>
      <div className="mt-3 text-2xl font-bold text-slate-900">{value ?? '—'}</div>
      {hint && <div className="mt-1 text-xs text-slate-500">{hint}</div>}
    </div>
  )
}

