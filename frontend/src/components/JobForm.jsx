import { useState } from 'react'
import { FormField, Alert } from './FormField.jsx'

const EMPLOYMENT_TYPES = [
  ['full_time', 'Full-time'],
  ['part_time', 'Part-time'],
  ['contract', 'Contract'],
  ['internship', 'Internship'],
  ['temporary', 'Temporary'],
]
const EXPERIENCE_LEVELS = [
  ['entry', 'Entry'],
  ['mid', 'Mid'],
  ['senior', 'Senior'],
  ['lead', 'Lead'],
]
const CURRENCIES = ['USD', 'EUR', 'GBP', 'PKR', 'INR', 'AED', 'CAD', 'AUD']

const DEFAULT = {
  title: '',
  description: '',
  requirements: '',
  location: '',
  is_remote: false,
  employment_type: 'full_time',
  experience_level: 'mid',
  category: '',
  salary_min: '',
  salary_max: '',
  currency: 'USD',
  is_active: true,
}

export default function JobForm({ initial = null, onSubmit, submitLabel = 'Save', busy = false, allowToggleActive = false }) {
  const [form, setForm] = useState(() => ({ ...DEFAULT, ...(initial || {}), salary_min: initial?.salary_min ?? '', salary_max: initial?.salary_max ?? '' }))
  const [error, setError] = useState(null)

  const onChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((f) => ({ ...f, [name]: type === 'checkbox' ? checked : value }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(null)

    const sMin = form.salary_min === '' ? null : Number(form.salary_min)
    const sMax = form.salary_max === '' ? null : Number(form.salary_max)
    if (sMin != null && sMax != null && sMax < sMin) {
      setError('Maximum salary must be greater than or equal to the minimum.')
      return
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      requirements: form.requirements.trim() || null,
      location: form.location.trim() || null,
      is_remote: !!form.is_remote,
      employment_type: form.employment_type,
      experience_level: form.experience_level,
      category: form.category.trim() || null,
      salary_min: sMin,
      salary_max: sMax,
      currency: form.currency,
    }
    if (allowToggleActive) payload.is_active = !!form.is_active

    try {
      await onSubmit(payload)
    } catch (e) {
      const d = e?.response?.data?.detail
      setError(typeof d === 'string' ? d : Array.isArray(d) ? d[0]?.msg : 'Could not save job.')
    }
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-5 p-6">
      {error && <Alert kind="error">{error}</Alert>}

      <FormField label="Job title">
        <input className="input" name="title" required maxLength={255} value={form.title} onChange={onChange} placeholder="Senior Frontend Engineer" />
      </FormField>

      <FormField label="Description" hint="Markdown-friendly — line breaks are preserved.">
        <textarea className="input min-h-[180px]" name="description" required value={form.description} onChange={onChange} />
      </FormField>

      <FormField label="Requirements" hint="Optional — what the ideal candidate brings.">
        <textarea className="input min-h-[120px]" name="requirements" value={form.requirements} onChange={onChange} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Location" hint='e.g. "New York, NY" or leave blank if remote'>
          <input className="input" name="location" maxLength={255} value={form.location} onChange={onChange} />
        </FormField>
        <FormField label="Remote">
          <label className="mt-2 inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="is_remote" checked={form.is_remote} onChange={onChange} />
            This role is fully remote
          </label>
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Employment type">
          <select className="input" name="employment_type" value={form.employment_type} onChange={onChange}>
            {EMPLOYMENT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </FormField>
        <FormField label="Experience level">
          <select className="input" name="experience_level" value={form.experience_level} onChange={onChange}>
            {EXPERIENCE_LEVELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </FormField>
        <FormField label="Category" hint='e.g. "Engineering", "Design"'>
          <input className="input" name="category" maxLength={120} value={form.category} onChange={onChange} />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_120px]">
        <FormField label="Salary min" hint="Optional">
          <input className="input" type="number" min="0" name="salary_min" value={form.salary_min} onChange={onChange} />
        </FormField>
        <FormField label="Salary max" hint="Optional">
          <input className="input" type="number" min="0" name="salary_max" value={form.salary_max} onChange={onChange} />
        </FormField>
        <FormField label="Currency">
          <select className="input" name="currency" value={form.currency} onChange={onChange}>
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </FormField>
      </div>

      {allowToggleActive && (
        <FormField label="Status">
          <label className="mt-2 inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" name="is_active" checked={form.is_active} onChange={onChange} />
            Job is active and accepting applications
          </label>
        </FormField>
      )}

      <div>
        <button className="btn-primary" disabled={busy}>
          {busy ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  )
}
