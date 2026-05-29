export function FormField({ label, hint, error, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  )
}

export function Alert({ kind = 'info', children }) {
  const cls =
    kind === 'success'
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
      : kind === 'error'
      ? 'bg-red-50 text-red-700 ring-red-200'
      : 'bg-brand-50 text-brand-700 ring-brand-200'
  return <div className={`rounded-lg px-3 py-2 text-sm ring-1 ${cls}`}>{children}</div>
}
