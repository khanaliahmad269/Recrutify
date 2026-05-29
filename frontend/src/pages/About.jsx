import { Link } from 'react-router-dom'
import { FiZap, FiShield, FiUsers } from 'react-icons/fi'

export default function About() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">About Recrutify</h1>
        <p className="mt-4 text-lg text-slate-600">
          Recrutify is a modern, AI-powered job portal that connects talented candidates with the
          companies hiring them. We built the platform around a simple idea: matching should be
          better than keyword search.
        </p>
      </header>

      <section className="mt-12 grid gap-6 sm:grid-cols-3">
        <Feature icon={FiZap} title="AI-powered matching">
          Every resume is vectorized with TF-IDF and ranked against open roles using cosine
          similarity, so the best fits surface first.
        </Feature>
        <Feature icon={FiShield} title="Verified employers">
          Companies are reviewed before they can advertise so you spend your time on real
          opportunities.
        </Feature>
        <Feature icon={FiUsers} title="Built for three roles">
          Job seekers, employers, and admins each get a dedicated dashboard — no shoehorning.
        </Feature>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-bold">How it works</h2>
        <ol className="mt-4 space-y-3 text-slate-700">
          <Step n={1}>Create an account as a job seeker or employer.</Step>
          <Step n={2}>
            Seekers upload a resume (PDF / DOCX / TXT). We extract the text and store it ready for
            AI matching.
          </Step>
          <Step n={3}>
            Employers create a company profile and post jobs with description, requirements, salary
            range, and experience level.
          </Step>
          <Step n={4}>
            The AI engine ranks jobs for each seeker and ranks applicants for each employer using
            classical text-similarity techniques (TF-IDF + cosine).
          </Step>
          <Step n={5}>
            Employers move candidates through review → shortlist → hire. Seekers track every
            application from one dashboard.
          </Step>
        </ol>
      </section>

      <section className="mt-16 card p-8 text-center">
        <h2 className="text-2xl font-bold">Ready to try it?</h2>
        <p className="mt-2 text-slate-600">Create a free account and apply to your first role in minutes.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/register" className="btn-primary">Sign up</Link>
          <Link to="/jobs" className="btn-secondary">Browse jobs</Link>
        </div>
      </section>
    </div>
  )
}

function Feature({ icon: Icon, title, children }) {
  return (
    <div className="card p-6">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-600">
        <Icon size={20} />
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{children}</p>
    </div>
  )
}

function Step({ n, children }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-7 w-7 flex-shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
        {n}
      </span>
      <span className="pt-0.5 text-sm leading-relaxed">{children}</span>
    </li>
  )
}
