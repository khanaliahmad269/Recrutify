import { useState } from 'react'
import { FiMail, FiMapPin, FiClock } from 'react-icons/fi'

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', topic: 'general', message: '' })
  const [sent, setSent] = useState(false)

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = (e) => {
    e.preventDefault()
    // No real submission endpoint — this is a marketing form. Just acknowledge.
    setSent(true)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Get in touch</h1>
        <p className="mt-4 text-lg text-slate-600">
          Questions about Recrutify, a partnership opportunity, or feedback on the platform? We'd love to hear from you.
        </p>
      </header>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_320px]">
        <form onSubmit={onSubmit} className="card flex flex-col gap-4 p-6">
          {sent && (
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 ring-1 ring-emerald-200">
              Thanks! Your message has been received. We'll reply within two business days.
            </div>
          )}
          <Field label="Your name">
            <input className="input" name="name" required value={form.name} onChange={onChange} />
          </Field>
          <Field label="Email address">
            <input type="email" className="input" name="email" required value={form.email} onChange={onChange} />
          </Field>
          <Field label="What's this about?">
            <select className="input" name="topic" value={form.topic} onChange={onChange}>
              <option value="general">General enquiry</option>
              <option value="employer">Employer onboarding</option>
              <option value="support">Account / technical support</option>
              <option value="press">Press &amp; media</option>
              <option value="other">Something else</option>
            </select>
          </Field>
          <Field label="Message">
            <textarea
              className="input min-h-[140px]"
              name="message"
              required
              minLength={10}
              value={form.message}
              onChange={onChange}
            />
          </Field>
          <div>
            <button className="btn-primary" disabled={sent}>
              {sent ? 'Sent' : 'Send message'}
            </button>
          </div>
        </form>

        <aside className="grid gap-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <FiMail className="text-brand-600" /> Email
            </div>
            <a href="mailto:hello@recrutify.dev" className="mt-1 block text-sm text-brand-700 hover:underline">
              hello@recrutify.dev
            </a>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <FiMapPin className="text-brand-600" /> Office
            </div>
            <p className="mt-1 text-sm text-slate-600">Recrutify HQ<br/>Lahore, Pakistan</p>
          </div>
          <div className="card p-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <FiClock className="text-brand-600" /> Response time
            </div>
            <p className="mt-1 text-sm text-slate-600">Within two business days, Monday to Friday.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  )
}
