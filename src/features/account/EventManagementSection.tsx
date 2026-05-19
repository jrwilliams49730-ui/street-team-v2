import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  createEvent,
  fetchOwnedEvents,
  formatEventDate,
  formatEventLocation,
  formatEventStatus,
  formatEventTime,
  isDuplicateEventSlugError,
  type EventOrganizerType,
  type EventStatus,
  type StreetTeamEvent,
} from '../events/events'

type EventManagementSectionProps = {
  organizerProfileId: string
  organizerType: EventOrganizerType
  ownerUserId: string
}

type EventFormState = {
  addressLine1: string
  addressLine2: string
  category: string
  city: string
  country: string
  description: string
  doorsTime: string
  endTime: string
  eventDate: string
  postalCode: string
  startTime: string
  state: string
  status: EventStatus
  title: string
  venueName: string
}

type EventMessage = {
  eventSlug?: string
  eventStatus?: EventStatus
  type: 'success' | 'error'
  text: string
}

const emptyEventForm: EventFormState = {
  addressLine1: '',
  addressLine2: '',
  category: '',
  city: '',
  country: 'USA',
  description: '',
  doorsTime: '',
  endTime: '',
  eventDate: '',
  postalCode: '',
  startTime: '',
  state: '',
  status: 'published',
  title: '',
  venueName: '',
}

function EventManagementSection({
  organizerProfileId,
  organizerType,
  ownerUserId,
}: EventManagementSectionProps) {
  const [events, setEvents] = useState<StreetTeamEvent[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [formState, setFormState] = useState<EventFormState>(emptyEventForm)
  const [message, setMessage] = useState<EventMessage | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadEvents() {
      setStatus('loading')

      try {
        const nextEvents = await fetchOwnedEvents(
          ownerUserId,
          organizerType,
          organizerProfileId,
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

    void loadEvents()

    return () => {
      isMounted = false
    }
  }, [organizerProfileId, organizerType, ownerUserId])

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsCreating(true)
    setMessage(null)

    try {
      const nextEvent = await createEvent({
        ...formState,
        organizerProfileId,
        organizerType,
        ownerUserId,
      })

      setEvents((currentEvents) => [nextEvent, ...currentEvents])
      setFormState(emptyEventForm)
      setStatus('ready')
      setMessage({
        eventSlug: nextEvent.slug,
        eventStatus: nextEvent.status,
        type: 'success',
        text:
          nextEvent.status === 'published'
            ? 'Event published.'
            : 'Event saved as a draft.',
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text: isDuplicateEventSlugError(error)
          ? 'An event with that URL already exists. Slightly adjust the event title for now.'
          : error instanceof Error
            ? error.message
            : 'Event could not be created. Please try again.',
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="event-management">
      <header className="event-management-heading">
        <h3>Your Events</h3>
        <p>Create official Street Team events for your account.</p>
      </header>

      <form className="auth-form event-form" onSubmit={handleCreate}>
        <label>
          <span>Event title</span>
          <input
            type="text"
            value={formState.title}
            onChange={(event) =>
              setFormState((currentState) => ({
                ...currentState,
                title: event.target.value,
              }))
            }
            required
          />
        </label>

        <label>
          <span>Category</span>
          <input
            type="text"
            value={formState.category}
            placeholder="Comedy, concert, open mic..."
            onChange={(event) =>
              setFormState((currentState) => ({
                ...currentState,
                category: event.target.value,
              }))
            }
          />
        </label>

        <label>
          <span>Description</span>
          <textarea
            value={formState.description}
            rows={4}
            onChange={(event) =>
              setFormState((currentState) => ({
                ...currentState,
                description: event.target.value,
              }))
            }
          />
        </label>

        <div className="event-date-time-grid">
          <label>
            <span>Event date</span>
            <input
              type="date"
              value={formState.eventDate}
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  eventDate: event.target.value,
                }))
              }
              required
            />
          </label>

          <label>
            <span>Doors time</span>
            <input
              type="time"
              value={formState.doorsTime}
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  doorsTime: event.target.value,
                }))
              }
            />
          </label>

          <label>
            <span>Start time</span>
            <input
              type="time"
              value={formState.startTime}
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  startTime: event.target.value,
                }))
              }
            />
          </label>

          <label>
            <span>End time</span>
            <input
              type="time"
              value={formState.endTime}
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  endTime: event.target.value,
                }))
              }
            />
          </label>
        </div>

        <label>
          <span>Venue name</span>
          <input
            type="text"
            value={formState.venueName}
            onChange={(event) =>
              setFormState((currentState) => ({
                ...currentState,
                venueName: event.target.value,
              }))
            }
            required
          />
        </label>

        <label>
          <span>Address line 1</span>
          <input
            type="text"
            value={formState.addressLine1}
            onChange={(event) =>
              setFormState((currentState) => ({
                ...currentState,
                addressLine1: event.target.value,
              }))
            }
          />
        </label>

        <label>
          <span>Address line 2</span>
          <input
            type="text"
            value={formState.addressLine2}
            onChange={(event) =>
              setFormState((currentState) => ({
                ...currentState,
                addressLine2: event.target.value,
              }))
            }
          />
        </label>

        <div className="event-location-grid">
          <label>
            <span>City</span>
            <input
              type="text"
              value={formState.city}
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  city: event.target.value,
                }))
              }
              required
            />
          </label>

          <label>
            <span>State</span>
            <input
              type="text"
              value={formState.state}
              maxLength={2}
              placeholder="TX"
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  state: event.target.value.toUpperCase(),
                }))
              }
              required
            />
          </label>

          <label>
            <span>Postal code</span>
            <input
              type="text"
              value={formState.postalCode}
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  postalCode: event.target.value,
                }))
              }
            />
          </label>

          <label>
            <span>Country</span>
            <input
              type="text"
              value={formState.country}
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  country: event.target.value,
                }))
              }
            />
          </label>
        </div>

        <fieldset className="event-status-field">
          <legend>Status</legend>

          <div className="event-status-options">
            <label>
              <input
                type="radio"
                name="eventStatus"
                checked={formState.status === 'published'}
                onChange={() =>
                  setFormState((currentState) => ({
                    ...currentState,
                    status: 'published',
                  }))
                }
              />
              <span>Published</span>
            </label>

            <label>
              <input
                type="radio"
                name="eventStatus"
                checked={formState.status === 'draft'}
                onChange={() =>
                  setFormState((currentState) => ({
                    ...currentState,
                    status: 'draft',
                  }))
                }
              />
              <span>Draft</span>
            </label>
          </div>
        </fieldset>

        <button
          type="submit"
          className="auth-submit-button"
          disabled={isCreating}
        >
          {isCreating ? 'Creating event...' : 'Create Event'}
        </button>
      </form>

      {message ? (
        <p className={`auth-message ${message.type}`}>
          {message.text}{' '}
          {message.type === 'success' &&
          message.eventStatus === 'published' &&
          message.eventSlug ? (
            <Link to={`/events/${message.eventSlug}`}>View public event</Link>
          ) : null}
        </p>
      ) : null}

      <div className="owned-events-list">
        {status === 'loading' ? <p>Loading your events...</p> : null}

        {status === 'error' ? <p>Your events could not be loaded.</p> : null}

        {status === 'ready' && events.length === 0 ? (
          <p>No events created yet.</p>
        ) : null}

        {status === 'ready'
          ? events.map((event) => <OwnedEventCard key={event.id} event={event} />)
          : null}
      </div>
    </div>
  )
}

function OwnedEventCard({ event }: { event: StreetTeamEvent }) {
  const location = formatEventLocation(event)

  return (
    <article className="owned-event-card">
      <div className="owned-event-copy">
        <div className="owned-event-heading">
          <h4>{event.title}</h4>
          <span className={`event-status-badge is-${event.status}`}>
            {formatEventStatus(event.status)}
          </span>
        </div>

        <p>
          {formatEventDate(event.eventDate)}
          {event.startTime ? ` at ${formatEventTime(event.startTime)}` : ''}
        </p>
        <p>{event.venueName}</p>
        {location ? <p>{location}</p> : null}
      </div>

      {event.status === 'published' ? (
        <Link to={`/events/${event.slug}`} className="secondary-action-button">
          View public event
        </Link>
      ) : null}
    </article>
  )
}

export default EventManagementSection
