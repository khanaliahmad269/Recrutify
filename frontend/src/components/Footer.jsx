import { Link } from 'react-router-dom'
import { FiBriefcase } from 'react-icons/fi'

const COLUMNS = [
  {
    title: 'For job seekers',
    items: [
      { label: 'Browse jobs', to: '/jobs' },
      { label: 'Saved jobs', to: '/dashboard/saved' },
      { label: 'AI job matches', to: '/dashboard/recommendations' },
      { label: 'Build your resume', to: '/dashboard/resume' },
    ],
  },
  {
    title: 'For employers',
    items: [
      { label: 'Post a job', to: '/dashboard/jobs/new' },
      { label: 'Manage applicants', to: '/dashboard/jobs' },
      { label: 'Browse companies', to: '/companies' },
    ],
  },
  {
    title: 'Company',
    items: [
      { label: 'About', to: '/about' },
      { label: 'Contact', to: '/contact' },
      { label: 'Privacy', to: '/privacy' },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <Link to="/" className="inline-flex items-center gap-2 text-lg font-bold text-brand-700">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
              <FiBriefcase />
            </span>
            Recrutify
          </Link>
          <p className="mt-2 text-sm text-slate-600">
            AI-powered hiring — connecting talent with the world's best teams.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <FooterCol key={col.title} title={col.title} items={col.items} />
        ))}
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Recrutify. All rights reserved.
      </div>
    </footer>
  )
}

function FooterCol({ title, items }) {
  return (
    <div>
      <div className="text-sm font-semibold text-slate-800">{title}</div>
      <ul className="mt-2 space-y-1 text-sm text-slate-600">
        {items.map((item) => (
          <li key={item.to}>
            <Link to={item.to} className="rounded transition hover:text-brand-700">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
