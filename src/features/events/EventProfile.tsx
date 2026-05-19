import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  fetchPublishedEventBySlug,
  formatEventDate,
  formatEventTime,
  formatOrganizerType,
  type StreetTeamEvent,
} from './events'
import EventLineupSection from './EventLineupSection'
import EventTicketsSection from './EventTicketsSection'

function EventProfile() {
  const { slug } = useParams()
  const [event, setEvent] = useState<StreetTeamEvent | null>(null)
  const [status, setStatus] = useState<
    'loading' | 'ready' | 'not-found' | 'error'
  >('loading')

  useEffect(() => {
    let isMounted = true

    async function loadEvent() {
      if (!slug) {
        setStatus('not-found')
        return
      }

      try {
        const nextEvent = await fetchPublishedEventBySlug(slug)

        if (!isMounted) {
          return
        }

        if (nextEvent) {
          setEvent(nextEvent)
          setStatus('ready')
        } else {
          setStatus('not-found')
        }
      } catch {
        if (isMounted) {
          setStatus('error')
        }
      }
    }

    void loadEvent()

    return () => {
      isMounted = false
    }
  }, [slug])

  if (status === 'loading') {
    return (
      <section className="content-card empty-state">
        <h2>Loading event...</h2>
        <p>Getting the latest event details.</p>
      </section>
    )
  }

  if (status === 'error') {
    return (
      <section className="content-card empty-state">
        <h2>Event could not load</h2>
        <p>Please try again in a moment.</p>
        <Link to="/events" className="back-link">
          Back to events
        </Link>
      </section>
    )
  }

  if (status === 'not-found' || !event) {
    return (
      <section className="content-card empty-state">
        <h2>Event not found</h2>
        <p>That event is not public or does not exist.</p>
        <Link to="/events" className="back-link">
          Back to events
        </Link>
      </section>
    )
  }

  const timeRows = [
    event.doorsTime ? `Doors ${formatEventTime(event.doorsTime)}` : '',
    event.startTime ? `Starts ${formatEventTime(event.startTime)}` : '',
    event.endTime ? `Ends ${formatEventTime(event.endTime)}` : '',
  ].filter(Boolean)
  const locationRows = [
    event.venueName,
    event.addressLine1,
    event.addressLine2,
    [event.city, event.state, event.postalCode]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(', '),
    event.country,
  ].filter(Boolean)

  return (
    <section className="event-profile">
      <Link to="/events" className="back-link">
        Back to events
      </Link>

      <article className="profile-card event-profile-card">
        {event.eventImageUrl ? (
          <div className="event-profile-image-frame">
            <img
              src={event.eventImageUrl}
              alt=""
              className="event-profile-image"
            />
          </div>
        ) : null}

        <div className="profile-copy">
          {event.category ? <p className="eyebrow">{event.category}</p> : null}
          <h2>{event.title}</h2>
          <p>{formatOrganizerType(event.organizerType)}</p>
        </div>

        {event.description ? (
          <p className="profile-bio">{event.description}</p>
        ) : null}
      </article>

      <section className="event-detail-panel">
        <h3>Date and Time</h3>
        <div className="event-detail-list">
          <p>{formatEventDate(event.eventDate)}</p>
          {timeRows.map((timeRow) => (
            <p key={timeRow}>{timeRow}</p>
          ))}
        </div>
      </section>

      <section className="event-detail-panel">
        <h3>Location</h3>
        <div className="event-detail-list">
          {locationRows.map((locationRow) => (
            <p key={locationRow}>{locationRow}</p>
          ))}
        </div>
      </section>

      <EventTicketsSection eventId={event.id} />
      <EventLineupSection eventId={event.id} />
    </section>
  )
}

export default EventProfile
