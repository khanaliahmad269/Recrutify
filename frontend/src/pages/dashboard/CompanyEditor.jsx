import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { companiesApi } from '../../services/api.js'
import { Alert, FormField } from '../../components/FormField.jsx'

const SIZE_OPTIONS = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']

const EMPTY = {
  name: '',
  description: '',
  website: '',
  location: '',
  industry: '',
  size_range: '',
}

export default function CompanyEditor() {
  const navigate = useNavigate()
  const [existing, setExisting] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    companiesApi
      .myOwned()
      .then((c) => {
        setExisting(c)
        setForm({
          name: c.name || '',
          description: c.description || '',
          website: c.website || '',
          location: c.location || '',
          industry: c.industry || '',
          size_range: c.size_range || '',
        })
      })
      .catch((e) => {
        if (e?.response?.status !== 404) setErr(e?.response?.data?.detail || 'Could not load company.')
      })
      .finally(() => setLoading(false))
  }, [])

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    setBusy(true)
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      website: form.website.trim() || null,
      location: form.location.trim() || null,
      industry: form.industry.trim() || null,
      size_range: form.size_range || null,
    }
    try {
      if (existing) {
        const updated = await companiesApi.update(existing.id, payload)
        setExisting(updated)
        setMsg('Company updated.')
      } else {
        const created = await companiesApi.create(payload)
        setExisting(created)
        setMsg('Company created.')
        // After creating, the employer can now post jobs.
        setTimeout(() => navigate('/dashboard/jobs/new'), 600)
      }
    } catch (e) {
      const d = e?.response?.data?.detail
      setErr(typeof d === 'string' ? d : Array.isArray(d) ? d[0]?.msg : 'Could not save company.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="card p-8 text-slate-500">Loading company…</div>

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-bold">{existing ? 'Company profile' : 'Set up your company'}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {existing
            ? 'Update what candidates see when they view your company page or jobs.'
            : 'Create your company profile to start posting jobs.'}
        </p>
      </header>

      <form onSubmit={submit} className="card flex flex-col gap-5 p-6">
        {err && <Alert kind="error">{err}</Alert>}
        {msg && <Alert kind="success">{msg}</Alert>}

        <FormField label="Company name">
          <input className="input" name="name" required maxLength={255} value={form.name} onChange={onChange} />
        </FormField>

        <FormField label="About" hint="What does the company do? Why work here?">
          <textarea className="input min-h-[160px]" name="description" value={form.description} onChange={onChange} />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Website" hint="Include https://">
            <input className="input" type="url" name="website" value={form.website} onChange={onChange} placeholder="https://example.com" />
          </FormField>
          <FormField label="Headquarters">
            <input className="input" name="location" value={form.location} onChange={onChange} placeholder="Lahore, PK" />
          </FormField>
          <FormField label="Industry">
            <input className="input" name="industry" maxLength={120} value={form.industry} onChange={onChange} placeholder="SaaS / Logistics / …" />
          </FormField>
          <FormField label="Company size">
            <select className="input" name="size_range" value={form.size_range} onChange={onChange}>
              <option value="">Select size…</option>
              {SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormField>
        </div>

        <div>
          <button className="btn-primary" disabled={busy}>
            {busy ? 'Saving…' : existing ? 'Save changes' : 'Create company'}
          </button>
        </div>
      </form>
    </div>
  )
}
