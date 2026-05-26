import { Link } from 'react-router-dom'
import {
  formatEventDate,
  formatEventLocation,
  formatEventTime,
  formatOrganizerType,
  type StreetTeamEvent,
} from './events'

type EventCardProps = {
  distanceMiles?: number | null
  event: StreetTeamEvent
}

function EventCard({ distanceMiles = null, event }: EventCardProps) {
  const location = formatEventLocation(event)

  return (
    <Link to={`/app/events/${event.slug}`} className="event-card">
      {event.eventImageUrl ? (
        <div className="event-card-image-frame">
          <img
            src={event.eventImageUrl}
            alt=""
            className="event-card-image"
            loading="lazy"
          />
        </div>
      ) : null}

      <div className="event-card-main">
        <div className="event-card-copy">
          {event.category ? <p className="eyebrow">{event.category}</p> : null}
          <h3>{event.title}</h3>
          <p>
            {formatEventDate(event.eventDate)}
            {event.startTime ? ` at ${formatEventTime(event.startTime)}` : ''}
          </p>
        </div>

        <span className="event-organizer-label">
          {formatOrganizerType(event.organizerType)}
        </span>
      </div>

      <div className="event-card-location">
        <p>{event.venueName}</p>
        {location ? <p>{location}</p> : null}
        {typeof distanceMiles === 'number' ? (
          <p>{formatDistance(distanceMiles)} away</p>
        ) : null}
      </div>
    </Link>
  )
}

function formatDistance(distanceMiles: number) {
  return distanceMiles < 10
    ? `${distanceMiles.toFixed(1)} mi`
    : `${Math.round(distanceMiles)} mi`
}

export default EventCard
