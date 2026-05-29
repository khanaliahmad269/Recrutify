import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import JobForm from '../../components/JobForm.jsx'
import { Alert } from '../../components/FormField.jsx'
import { jobsApi } from '../../services/api.js'

export default function EditJob() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const justCreated = searchParams.get('created') === '1'

  const [job, setJob] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(justCreated ? 'Job published — you can keep editing below.' : null)

  useEffect(() => {
    jobsApi.get(id).then(setJob).catch((e) => setLoadError(e?.response?.data?.detail || 'Job not found.'))
  }, [id])

  // Clear the ?created=1 marker so a refresh doesn't keep the banner.
  useEffect(() => {
    if (justCreated) {
      const next = new URLSearchParams(searchParams)
      next.delete('created')
      setSearchParams(next, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loadError) return <Alert kind="error">{loadError}</Alert>
  if (!job) return <div className="card p-8 text-slate-500">Loading…</div>

  const onSubmit = async (payload) => {
    setBusy(true)
    setMsg(null)
    try {
      const updated = await jobsApi.update(id, payload)
      setJob(updated)
      setMsg('Changes saved.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-6">
      <header>
        <Link to="/dashboard/jobs" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-brand-700">
          <FiArrowLeft /> Posted jobs
        </Link>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Edit job</h1>
            <p className="mt-1 text-sm text-slate-600">
              <Link to={`/jobs/${id}`} className="text-brand-700 hover:underline">View public listing →</Link>
            </p>
          </div>
          <button
            onClick={() => navigate(`/dashboard/jobs/${id}/applicants`)}
            className="btn-secondary"
          >
            View applicants
          </button>
        </div>
      </header>

      {msg && <Alert kind="success">{msg}</Alert>}

      <JobForm
        initial={job}
        onSubmit={onSubmit}
        submitLabel="Save changes"
        busy={busy}
        allowToggleActive
      />
    </div>
  )
}
