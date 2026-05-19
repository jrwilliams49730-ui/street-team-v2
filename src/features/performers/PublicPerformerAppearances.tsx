import { useEffect, useState } from 'react'
import PerformerAppearanceCard from './PerformerAppearanceCard'
import {
  fetchUpcomingPerformerAppearances,
  type PerformerAppearance,
} from './performerAppearances'

type PublicPerformerAppearancesProps = {
  performerId: string
}

function PublicPerformerAppearances({
  performerId,
}: PublicPerformerAppearancesProps) {
  const [appearances, setAppearances] = useState<PerformerAppearance[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )

  useEffect(() => {
    let isMounted = true

    async function loadAppearances() {
      setStatus('loading')

      try {
        const nextAppearances =
          await fetchUpcomingPerformerAppearances(performerId)

        if (isMounted) {
          setAppearances(nextAppearances)
          setStatus('ready')
        }
      } catch {
        if (isMounted) {
          setStatus('error')
        }
      }
    }

    void loadAppearances()

    return () => {
      isMounted = false
    }
  }, [performerId])

  return (
    <section className="upcoming-shows">
      <h3>Upcoming Appearances</h3>

      {status === 'loading' ? <p>Loading upcoming appearances...</p> : null}

      {status === 'error' ? (
        <p>Upcoming appearances could not be loaded.</p>
      ) : null}

      {status === 'ready' && appearances.length === 0 ? (
        <p>No upcoming appearances listed yet.</p>
      ) : null}

      {status === 'ready' && appearances.length > 0 ? (
        <div className="appearance-list">
          {appearances.map((appearance) => (
            <PerformerAppearanceCard
              key={appearance.id}
              appearance={appearance}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}

export default PublicPerformerAppearances
