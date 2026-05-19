import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchUpcomingPerformerOfficialEvents,
  type PerformerOfficialEvent,
} from '../events/eventLineups'
import {
  formatEventDate,
  formatEventLocation,
} from '../events/events'

type PerformerOfficialEventsProps = {
  performerId: string
}

function PerformerOfficialEvents({ performerId }: PerformerOfficialEventsProps) {
  const [events, setEvents] = useState<PerformerOfficialEvent[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )

  useEffect(() => {
    let isMounted = true

    async function loadOfficialEvents() {
      setStatus('loading')

      try {
        const nextEvents = await fetchUpcomingPerformerOfficialEvents(
          performerId,
        )

        if (isMounted) {
          setEvents(nextEvents)
          setStatus('ready')
        }
      } catch {
        if (isMounted) {
          setStatus('error')
        }
      }
    }

    void loadOfficialEvents()

    return () => {
      isMounted = false
    }
  }, [performerId])

  if (status === 'loading' || status === 'error' || events.length === 0) {
    return null
  }

  return (
    <section className="upcoming-shows official-events-section">
      <h3>Upcoming Street Team Events</h3>

      <div className="official-events-list">
        {events.map((entry) => {
          const location = formatEventLocation(entry.event)

          return (
            <Link
              key={entry.lineupId}
              to={`/events/${entry.event.slug}`}
              className="official-event-card"
            >
              <div>
                <h4>{entry.event.title}</h4>
                <p>{formatEventDate(entry.event.eventDate)}</p>
                <p>{entry.event.venueName}</p>
                {location ? <p>{location}</p> : null}
                {entry.lineupRole ? <span>{entry.lineupRole}</span> : null}
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export default PerformerOfficialEvents
