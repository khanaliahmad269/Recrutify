import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'job_seeker',
  })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await register(form)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const detail = err?.response?.data?.detail
      setError(typeof detail === 'string' ? detail : 'Registration failed. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-slate-600">Apply to jobs, save searches, and track applications.</p>
      </div>

      <form onSubmit={onSubmit} className="card flex flex-col gap-4 p-6">
        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">{error}</div>
        )}
        <Field label="Full name">
          <input className="input" name="full_name" required value={form.full_name} onChange={onChange} />
        </Field>
        <Field label="Email">
          <input className="input" type="email" name="email" required value={form.email} onChange={onChange} />
        </Field>
        <Field label="Password" hint="At least 8 characters">
          <input className="input" type="password" name="password" minLength={8} required value={form.password} onChange={onChange} />
        </Field>
        <Field label="I am a…">
          <select className="input" name="role" value={form.role} onChange={onChange}>
            <option value="job_seeker">Job seeker</option>
            <option value="employer">Employer</option>
          </select>
        </Field>
        <button className="btn-primary justify-center" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <div className="text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-brand-700 hover:underline">Log in</Link>
      </div>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}
