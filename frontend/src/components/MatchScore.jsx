export default function MatchScore({ score, size = 'md' }) {
  const pct = Math.round((score || 0) * 100)
  const tone =
    pct >= 60 ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
    : pct >= 30 ? 'bg-blue-50 text-blue-700 ring-blue-200'
    : 'bg-slate-100 text-slate-600 ring-slate-200'
  const cls = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full ring-1 font-medium ${tone} ${cls}`}>
      <span className="opacity-70">match</span> {pct}%
    </span>
  )
}
