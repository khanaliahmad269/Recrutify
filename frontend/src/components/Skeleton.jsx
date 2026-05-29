export function SkeletonCard() {
  return (
    <div className="card animate-pulse p-5">
      <div className="h-5 w-3/5 rounded bg-slate-200" />
      <div className="mt-3 h-4 w-1/4 rounded bg-slate-200" />
      <div className="mt-4 flex gap-3">
        <div className="h-4 w-20 rounded bg-slate-200" />
        <div className="h-4 w-24 rounded bg-slate-200" />
        <div className="h-4 w-16 rounded bg-slate-200" />
      </div>
    </div>
  )
}

export function SkeletonList({ count = 4 }) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
