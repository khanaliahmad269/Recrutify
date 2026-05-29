import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import JobForm from '../../components/JobForm.jsx'
import { Alert } from '../../components/FormField.jsx'
import { companiesApi, jobsApi } from '../../services/api.js'

export default function PostJob() {
  const navigate = useNavigate()
  const [hasCompany, setHasCompany] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    companiesApi.myOwned().then(() => setHasCompany(true)).catch((e) => {
      if (e?.response?.status === 404) setHasCompany(false)
      else setHasCompany(false)
    })
  }, [])

  if (hasCompany === null) {
    return <div className="card p-8 text-slate-500">Loading…</div>
  }
  if (hasCompany === false) {
    return (
      <div className="grid gap-4">
        <Alert kind="info">
          You need a company profile before posting jobs.{' '}
          <Link to="/dashboard/company" className="font-medium underline">Set one up</Link>{' '}
          first.
        </Alert>
      </div>
    )
  }

  const onSubmit = async (payload) => {
    setBusy(true)
    try {
      const job = await jobsApi.create(payload)
      navigate(`/dashboard/jobs/${job.id}/edit?created=1`)
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
        <h1 className="mt-2 text-2xl font-bold">Post a new job</h1>
        <p className="mt-1 text-sm text-slate-600">Candidates will see this listing within seconds of saving.</p>
      </header>
      <JobForm onSubmit={onSubmit} submitLabel="Publish job" busy={busy} />
    </div>
  )
}
