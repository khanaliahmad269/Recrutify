export default function Empty({ title = 'Nothing here yet', message, action }) {
  return (
    <div className="card flex flex-col items-center gap-2 p-10 text-center">
      <div className="text-base font-semibold text-slate-700">{title}</div>
      {message && <p className="text-sm text-slate-500">{message}</p>}
      {action}
    </div>
  )
}
