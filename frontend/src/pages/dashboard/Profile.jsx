import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { authApi } from '../../services/api.js'

export default function Profile() {
  const { user, setUser } = useAuth()
  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="mt-1 text-sm text-slate-600">Manage your account details and password.</p>
      </header>
      <ProfileForm user={user} setUser={setUser} />
      <PasswordForm />
    </div>
  )
}

function ProfileForm({ user, setUser }) {
  const [form, setForm] = useState({ full_name: user.full_name, email: user.email })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)

  const dirty = form.full_name !== user.full_name || form.email !== user.email

  const submit = async (e) => {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    setBusy(true)
    try {
      const updated = await authApi.updateMe({
        full_name: form.full_name !== user.full_name ? form.full_name : undefined,
        email: form.email !== user.email ? form.email : undefined,
      })
      setUser(updated)
      setMsg('Profile updated.')
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Could not update profile.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-4 p-6">
      <h2 className="text-lg font-semibold">Account details</h2>
      {err && <Alert kind="error">{err}</Alert>}
      {msg && <Alert kind="success">{msg}</Alert>}
      <Field label="Full name">
        <input
          className="input"
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          required
        />
      </Field>
      <Field label="Email">
        <input
          type="email"
          className="input"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
      </Field>
      <div>
        <button className="btn-primary" disabled={!dirty || busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  )
}

function PasswordForm() {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setErr(null)
    setMsg(null)
    if (form.new_password !== form.confirm) {
      setErr("New passwords don't match.")
      return
    }
    setBusy(true)
    try {
      await authApi.changePassword({
        current_password: form.current_password,
        new_password: form.new_password,
      })
      setForm({ current_password: '', new_password: '', confirm: '' })
      setMsg('Password updated.')
    } catch (e) {
      setErr(e?.response?.data?.detail || 'Could not change password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-4 p-6">
      <h2 className="text-lg font-semibold">Change password</h2>
      {err && <Alert kind="error">{err}</Alert>}
      {msg && <Alert kind="success">{msg}</Alert>}
      <Field label="Current password">
        <input
          type="password"
          className="input"
          required
          value={form.current_password}
          onChange={(e) => setForm({ ...form, current_password: e.target.value })}
        />
      </Field>
      <Field label="New password" hint="At least 8 characters">
        <input
          type="password"
          className="input"
          minLength={8}
          required
          value={form.new_password}
          onChange={(e) => setForm({ ...form, new_password: e.target.value })}
        />
      </Field>
      <Field label="Confirm new password">
        <input
          type="password"
          className="input"
          minLength={8}
          required
          value={form.confirm}
          onChange={(e) => setForm({ ...form, confirm: e.target.value })}
        />
      </Field>
      <div>
        <button className="btn-primary" disabled={busy}>
          {busy ? 'Updating…' : 'Update password'}
        </button>
      </div>
    </form>
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

function Alert({ kind, children }) {
  const cls =
    kind === 'success'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : 'bg-red-50 text-red-700 ring-red-200'
  return <div className={`rounded-lg px-3 py-2 text-sm ring-1 ${cls}`}>{children}</div>
}
