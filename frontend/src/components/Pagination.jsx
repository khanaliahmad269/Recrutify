import { FiChevronLeft, FiChevronRight } from 'react-icons/fi'

export default function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null
  const prev = () => page > 1 && onChange(page - 1)
  const next = () => page < pages && onChange(page + 1)

  return (
    <div className="mt-6 flex items-center justify-center gap-2">
      <button onClick={prev} disabled={page <= 1} className="btn-secondary">
        <FiChevronLeft />
      </button>
      <span className="text-sm text-slate-600">
        Page <span className="font-medium text-slate-900">{page}</span> of {pages}
      </span>
      <button onClick={next} disabled={page >= pages} className="btn-secondary">
        <FiChevronRight />
      </button>
    </div>
  )
}
