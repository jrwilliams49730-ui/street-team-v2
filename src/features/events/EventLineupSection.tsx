import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProfileImageAvatar from '../profile-images/ProfileImageAvatar'
import {
  fetchEventLineup,
  type EventLineupEntry,
} from './eventLineups'

type EventLineupSectionProps = {
  eventId: string
}

function EventLineupSection({ eventId }: EventLineupSectionProps) {
  const [lineup, setLineup] = useState<EventLineupEntry[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )

  useEffect(() => {
    let isMounted = true

    async function loadLineup() {
      setStatus('loading')

      try {
        const nextLineup = await fetchEventLineup(eventId)

        if (isMounted) {
          setLineup(nextLineup)
          setStatus('ready')
        }
      } catch {
        if (isMounted) {
          setStatus('error')
        }
      }
    }

    void loadLineup()

    return () => {
      isMounted = false
    }
  }, [eventId])

  if (status === 'loading' || status === 'error' || lineup.length === 0) {
    return null
  }

  return (
    <section className="event-detail-panel event-lineup-panel">
      <h3>Lineup</h3>

      <div className="lineup-list">
        {lineup.map((entry) =>
          entry.performer ? (
            <Link
              key={entry.id}
              to={`/app/performers/${entry.performer.slug}`}
              className="lineup-card"
            >
              <div className="lineup-main">
                <ProfileImageAvatar
                  className="lineup-avatar performer-avatar"
                  imageUrl={entry.performer.imageUrl}
                  initials={entry.performer.initials}
                  name={entry.performer.name}
                />

                <div className="lineup-copy">
                  <h4>{entry.performer.name}</h4>
                  <p>{entry.performer.category}</p>
                  {entry.lineupRole ? <span>{entry.lineupRole}</span> : null}
                </div>
              </div>
            </Link>
          ) : null,
        )}
      </div>
    </section>
  )
}

export default EventLineupSection
