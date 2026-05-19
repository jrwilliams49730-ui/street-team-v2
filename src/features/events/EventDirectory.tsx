import { useEffect, useState } from 'react'
import EventCard from './EventCard'
import { fetchPublishedEvents, type StreetTeamEvent } from './events'

function EventDirectory() {
  const [events, setEvents] = useState<StreetTeamEvent[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )

  useEffect(() => {
    let isMounted = true

    async function loadEvents() {
      setStatus('loading')

      try {
        const nextEvents = await fetchPublishedEvents()

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

    void loadEvents()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <section className="event-directory">
      <header className="section-heading">
        <h2>Events</h2>
        <p>Official Street Team events from producers and venues.</p>
      </header>

      {status === 'loading' ? (
        <DirectoryStateCard message="Loading events..." />
      ) : null}

      {status === 'error' ? (
        <DirectoryStateCard message="Events could not be loaded." />
      ) : null}

      {status === 'ready' && events.length === 0 ? (
        <DirectoryStateCard message="No published events have been added yet." />
      ) : null}

      {status === 'ready' && events.length > 0 ? (
        <div className="event-grid">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : null}
    </section>
  )
}

function DirectoryStateCard({ message }: { message: string }) {
  return (
    <div className="directory-state-card">
      <p>{message}</p>
    </div>
  )
}

export default EventDirectory
