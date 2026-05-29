import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FiZap, FiArrowRight } from 'react-icons/fi'
import { meApi } from '../../services/api.js'
import JobCard from '../../components/JobCard.jsx'
import MatchScore from '../../components/MatchScore.jsx'
import Empty from '../../components/Empty.jsx'
import { SkeletonList } from '../../components/Skeleton.jsx'
import { Alert } from '../../components/FormField.jsx'

export default function Recommendations() {
  const [matches, setMatches] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    meApi
      .jobMatches({ limit: 10 })
      .then(setMatches)
      .catch((e) => {
        if (e?.response?.status === 400) setError('no_resume')
        else setError(e?.response?.data?.detail || 'Could not compute job matches.')
        setMatches([])
      })
  }, [])

  return (
    <div>
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <FiZap className="text-brand-600" /> AI job matches
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Active jobs ranked against your resume using TF-IDF + cosine similarity. Update your resume to refresh.
        </p>
      </header>

      {error === 'no_resume' && (
        <Alert kind="info">
          You haven't saved a resume yet.{' '}
          <Link to="/dashboard/resume" className="font-medium underline">Add one</Link> to see personalized matches.
        </Alert>
      )}
      {error && error !== 'no_resume' && <Alert kind="error">{error}</Alert>}

      {matches == null && <SkeletonList />}

      {matches?.length === 0 && !error && (
        <Empty title="No matches yet" message="No active jobs in the catalog. Check back later." />
      )}

      {matches?.length > 0 && (
        <div className="grid gap-4">
          {matches.map((m) => (
            <JobCard
              key={m.job.id}
              job={m.job}
              action={
                <div className="flex items-center justify-between gap-2">
                  <MatchScore score={m.score} />
                  <Link to={`/jobs/${m.job.id}`} className="btn-secondary">
                    View role <FiArrowRight />
                  </Link>
                </div>
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
