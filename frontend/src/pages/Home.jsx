import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiSearch, FiMapPin, FiTrendingUp, FiZap, FiShield } from 'react-icons/fi'

const stats = [
  { label: 'Active jobs', value: '12,400+' },
  { label: 'Companies hiring', value: '3,800+' },
  { label: 'Candidates placed', value: '58,000+' },
  { label: 'Avg. match score', value: '94%' },
]

const features = [
  {
    icon: FiZap,
    title: 'AI-powered matching',
    desc: 'Our resume engine scores your fit against every role so the best opportunities surface first.',
  },
  {
    icon: FiTrendingUp,
    title: 'Real-time analytics',
    desc: 'Employers see hiring funnels and applicant quality at a glance.',
  },
  {
    icon: FiShield,
    title: 'Verified employers',
    desc: 'Every company is reviewed before posting — apply with confidence.',
  },
]

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-brand-100/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto max-w-3xl text-center"
          >
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl">
              Find your <span className="text-brand-600">next role</span>, faster.
            </h1>
            <p className="mt-5 text-lg text-slate-600">
              Recrutify uses AI to match your skills with thousands of jobs from top companies — apply in one click.
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-2 rounded-2xl bg-white p-3 shadow-elevated sm:grid-cols-[1fr_1fr_auto]"
            onSubmit={(e) => e.preventDefault()}
          >
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <FiSearch className="text-slate-400" />
              <input className="w-full bg-transparent text-sm outline-none" placeholder="Job title or keyword" />
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <FiMapPin className="text-slate-400" />
              <input className="w-full bg-transparent text-sm outline-none" placeholder="Location or 'Remote'" />
            </div>
            <Link to="/jobs" className="btn-primary justify-center">Search jobs</Link>
          </motion.form>

          <div className="mx-auto mt-16 grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="card p-5 text-center">
                <div className="text-2xl font-bold text-brand-700">{s.value}</div>
                <div className="mt-1 text-xs uppercase tracking-wider text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">Built for modern hiring</h2>
          <p className="mt-3 text-slate-600">Everything candidates and recruiters need, in one place.</p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <motion.div
              key={f.title}
              whileHover={{ y: -4 }}
              className="card p-6"
            >
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-600">
                <f.icon size={20} />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-brand-600">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-12 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <h3 className="text-2xl font-bold text-white">Ready to get started?</h3>
            <p className="mt-1 text-brand-100">Create an account and apply to your first job in minutes.</p>
          </div>
          <div className="flex gap-3">
            <Link to="/register" className="btn bg-white text-brand-700 hover:bg-brand-50">Get started</Link>
            <Link to="/jobs" className="btn ring-1 ring-white text-white hover:bg-brand-700">Browse jobs</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
