import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <div className="text-7xl font-extrabold text-brand-600">404</div>
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-slate-600">The page you're looking for doesn't exist or has moved.</p>
      <Link to="/" className="btn-primary">Back to home</Link>
    </div>
  )
}
