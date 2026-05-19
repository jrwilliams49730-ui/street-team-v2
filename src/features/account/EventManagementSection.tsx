import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { Link } from 'react-router-dom'
import { uploadEventImage } from '../events/eventImages'
import {
  cancelEvent,
  createEvent,
  deleteEvent,
  fetchOwnedEvents,
  formatEventDate,
  formatEventLocation,
  formatEventStatus,
  formatEventTime,
  isDuplicateEventSlugError,
  updateEvent,
  updateEventImageUrl,
  type EventFormInput,
  type EventOrganizerType,
  type EventStatus,
  type StreetTeamEvent,
} from '../events/events'

type EventManagementSectionProps = {
  organizerProfileId: string
  organizerType: EventOrganizerType
  ownerUserId: string
}

type EventFormState = EventFormInput

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
  const [flyerFile, setFlyerFile] = useState<File | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editFormState, setEditFormState] =
    useState<EventFormState>(emptyEventForm)
  const [editFlyerFile, setEditFlyerFile] = useState<File | null>(null)
  const [editFileInputKey, setEditFileInputKey] = useState(0)
  const [message, setMessage] = useState<EventMessage | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [savingEventId, setSavingEventId] = useState<string | null>(null)
  const [cancellingEventId, setCancellingEventId] = useState<string | null>(
    null,
  )
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null)

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

    let createdEvent: StreetTeamEvent | null = null

    try {
      createdEvent = await createEvent({
        ...formState,
        organizerProfileId,
        organizerType,
        ownerUserId,
      })

      const nextEvent = flyerFile
        ? await saveEventFlyer(createdEvent, flyerFile)
        : createdEvent

      setEvents((currentEvents) => [nextEvent, ...currentEvents])
      setFormState(emptyEventForm)
      setFlyerFile(null)
      setFileInputKey((currentKey) => currentKey + 1)
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
      if (createdEvent) {
        const eventWithoutFlyer = createdEvent

        setEvents((currentEvents) => [eventWithoutFlyer, ...currentEvents])
        setFormState(emptyEventForm)
        setFlyerFile(null)
        setFileInputKey((currentKey) => currentKey + 1)
        setStatus('ready')
        setMessage({
          eventSlug: eventWithoutFlyer.slug,
          eventStatus: eventWithoutFlyer.status,
          type: 'error',
          text:
            error instanceof Error
              ? `Event was created, but the flyer could not be uploaded: ${error.message}`
              : 'Event was created, but the flyer could not be uploaded.',
        })
      } else {
        setMessage({
          type: 'error',
          text: isDuplicateEventSlugError(error)
            ? 'An event with that URL already exists. Slightly adjust the event title for now.'
            : error instanceof Error
              ? error.message
              : 'Event could not be created. Please try again.',
        })
      }
    } finally {
      setIsCreating(false)
    }
  }

  function handleEditStart(event: StreetTeamEvent) {
    setEditingEventId(event.id)
    setEditFormState(getFormStateFromEvent(event))
    setEditFlyerFile(null)
    setEditFileInputKey((currentKey) => currentKey + 1)
    setMessage(null)
  }

  function handleEditCancel() {
    setEditingEventId(null)
    setEditFormState(emptyEventForm)
    setEditFlyerFile(null)
    setMessage(null)
  }

  async function handleEditSave(
    event: FormEvent<HTMLFormElement>,
    eventId: string,
  ) {
    event.preventDefault()
    setSavingEventId(eventId)
    setMessage(null)

    let updatedEvent: StreetTeamEvent | null = null

    try {
      updatedEvent = await updateEvent(ownerUserId, eventId, editFormState)

      const nextEvent = editFlyerFile
        ? await saveEventFlyer(updatedEvent, editFlyerFile)
        : updatedEvent

      setEvents((currentEvents) =>
        currentEvents.map((currentEvent) =>
          currentEvent.id === eventId ? nextEvent : currentEvent,
        ),
      )
      setEditingEventId(null)
      setEditFormState(emptyEventForm)
      setEditFlyerFile(null)
      setMessage({
        eventSlug: nextEvent.slug,
        eventStatus: nextEvent.status,
        type: 'success',
        text: 'Event updated.',
      })
    } catch (error) {
      if (updatedEvent) {
        const eventWithoutNewFlyer = updatedEvent

        setEvents((currentEvents) =>
          currentEvents.map((currentEvent) =>
            currentEvent.id === eventId ? eventWithoutNewFlyer : currentEvent,
          ),
        )
        setEditingEventId(null)
        setEditFormState(emptyEventForm)
        setEditFlyerFile(null)
        setMessage({
          eventSlug: eventWithoutNewFlyer.slug,
          eventStatus: eventWithoutNewFlyer.status,
          type: 'error',
          text:
            error instanceof Error
              ? `Event was updated, but the flyer could not be uploaded: ${error.message}`
              : 'Event was updated, but the flyer could not be uploaded.',
        })
      } else {
        setMessage({
          type: 'error',
          text:
            error instanceof Error
              ? error.message
              : 'Event could not be updated. Please try again.',
        })
      }
    } finally {
      setSavingEventId(null)
    }
  }

  async function handleCancelEvent(event: StreetTeamEvent) {
    const shouldCancel = window.confirm(`Cancel ${event.title}?`)

    if (!shouldCancel) {
      return
    }

    setCancellingEventId(event.id)
    setMessage(null)

    try {
      const nextEvent = await cancelEvent(ownerUserId, event.id)

      setEvents((currentEvents) =>
        currentEvents.map((currentEvent) =>
          currentEvent.id === event.id ? nextEvent : currentEvent,
        ),
      )
      setEditingEventId((currentId) =>
        currentId === event.id ? null : currentId,
      )
      setMessage({
        eventSlug: nextEvent.slug,
        eventStatus: nextEvent.status,
        type: 'success',
        text: 'Event cancelled.',
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Event could not be cancelled. Please try again.',
      })
    } finally {
      setCancellingEventId(null)
    }
  }

  async function handleDeleteEvent(event: StreetTeamEvent) {
    const shouldDelete = window.confirm(`Delete ${event.title}?`)

    if (!shouldDelete) {
      return
    }

    setDeletingEventId(event.id)
    setMessage(null)

    try {
      await deleteEvent(ownerUserId, event.id)
      setEvents((currentEvents) =>
        currentEvents.filter((currentEvent) => currentEvent.id !== event.id),
      )
      setEditingEventId((currentId) =>
        currentId === event.id ? null : currentId,
      )
      setMessage({
        type: 'success',
        text: 'Event deleted.',
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Event could not be deleted. Please try again.',
      })
    } finally {
      setDeletingEventId(null)
    }
  }

  async function saveEventFlyer(event: StreetTeamEvent, file: File) {
    const publicUrl = await uploadEventImage({
      eventId: event.id,
      file,
      ownerUserId,
    })

    return updateEventImageUrl(ownerUserId, event.id, publicUrl)
  }

  return (
    <div className="event-management">
      <header className="event-management-heading">
        <h3>Your Events</h3>
        <p>Create official Street Team events for your account.</p>
      </header>

      <EventForm
        fileInputKey={fileInputKey}
        flyerFile={flyerFile}
        formState={formState}
        includeCancelledStatus={false}
        isSubmitting={isCreating}
        onFileChange={setFlyerFile}
        onFormChange={setFormState}
        onSubmit={handleCreate}
        submitText="Create Event"
        submittingText="Creating event..."
      />

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
          ? events.map((event) =>
              editingEventId === event.id ? (
                <OwnedEventEditCard
                  key={event.id}
                  event={event}
                  fileInputKey={editFileInputKey}
                  flyerFile={editFlyerFile}
                  formState={editFormState}
                  isCancelling={cancellingEventId === event.id}
                  isDeleting={deletingEventId === event.id}
                  isSaving={savingEventId === event.id}
                  onCancelEdit={handleEditCancel}
                  onCancelEvent={handleCancelEvent}
                  onDeleteEvent={handleDeleteEvent}
                  onFileChange={setEditFlyerFile}
                  onFormChange={setEditFormState}
                  onSave={handleEditSave}
                />
              ) : (
                <OwnedEventCard
                  key={event.id}
                  event={event}
                  isCancelling={cancellingEventId === event.id}
                  isDeleting={deletingEventId === event.id}
                  onCancelEvent={handleCancelEvent}
                  onDeleteEvent={handleDeleteEvent}
                  onEditEvent={handleEditStart}
                />
              ),
            )
          : null}
      </div>
    </div>
  )
}

type EventFormProps = {
  currentImageUrl?: string | null
  fileInputKey: number
  flyerFile: File | null
  formState: EventFormState
  includeCancelledStatus: boolean
  isSubmitting: boolean
  onFileChange: (file: File | null) => void
  onFormChange: (formState: EventFormState) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  submitText: string
  submittingText: string
}

function EventForm({
  currentImageUrl,
  fileInputKey,
  flyerFile,
  formState,
  includeCancelledStatus,
  isSubmitting,
  onFileChange,
  onFormChange,
  onSubmit,
  submitText,
  submittingText,
}: EventFormProps) {
  function updateField<FieldName extends keyof EventFormState>(
    fieldName: FieldName,
    value: EventFormState[FieldName],
  ) {
    onFormChange({
      ...formState,
      [fieldName]: value,
    })
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    onFileChange(event.currentTarget.files?.[0] ?? null)
  }

  return (
    <form className="auth-form event-form" onSubmit={onSubmit}>
      <label>
        <span>Event title</span>
        <input
          type="text"
          value={formState.title}
          onChange={(event) => updateField('title', event.target.value)}
          required
        />
      </label>

      <label>
        <span>Category</span>
        <input
          type="text"
          value={formState.category}
          placeholder="Comedy, concert, open mic..."
          onChange={(event) => updateField('category', event.target.value)}
        />
      </label>

      <label>
        <span>Description</span>
        <textarea
          value={formState.description}
          rows={4}
          onChange={(event) => updateField('description', event.target.value)}
        />
      </label>

      <div className="event-date-time-grid">
        <label>
          <span>Event date</span>
          <input
            type="date"
            value={formState.eventDate}
            onChange={(event) => updateField('eventDate', event.target.value)}
            required
          />
        </label>

        <label>
          <span>Doors time</span>
          <input
            type="time"
            value={formState.doorsTime}
            onChange={(event) => updateField('doorsTime', event.target.value)}
          />
        </label>

        <label>
          <span>Start time</span>
          <input
            type="time"
            value={formState.startTime}
            onChange={(event) => updateField('startTime', event.target.value)}
          />
        </label>

        <label>
          <span>End time</span>
          <input
            type="time"
            value={formState.endTime}
            onChange={(event) => updateField('endTime', event.target.value)}
          />
        </label>
      </div>

      <label>
        <span>Venue name</span>
        <input
          type="text"
          value={formState.venueName}
          onChange={(event) => updateField('venueName', event.target.value)}
          required
        />
      </label>

      <label>
        <span>Address line 1</span>
        <input
          type="text"
          value={formState.addressLine1}
          onChange={(event) => updateField('addressLine1', event.target.value)}
        />
      </label>

      <label>
        <span>Address line 2</span>
        <input
          type="text"
          value={formState.addressLine2}
          onChange={(event) => updateField('addressLine2', event.target.value)}
        />
      </label>

      <div className="event-location-grid">
        <label>
          <span>City</span>
          <input
            type="text"
            value={formState.city}
            onChange={(event) => updateField('city', event.target.value)}
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
              updateField('state', event.target.value.toUpperCase())
            }
            required
          />
        </label>

        <label>
          <span>Postal code</span>
          <input
            type="text"
            value={formState.postalCode}
            onChange={(event) => updateField('postalCode', event.target.value)}
          />
        </label>

        <label>
          <span>Country</span>
          <input
            type="text"
            value={formState.country}
            onChange={(event) => updateField('country', event.target.value)}
          />
        </label>
      </div>

      <div className="event-image-field">
        <span>Event Flyer / Event Image</span>

        {currentImageUrl ? (
          <div className="owned-event-image-frame">
            <img src={currentImageUrl} alt="" className="owned-event-image" />
          </div>
        ) : null}

        <input
          key={fileInputKey}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
        />

        {flyerFile ? <p>{flyerFile.name}</p> : null}
      </div>

      <fieldset className="event-status-field">
        <legend>Status</legend>

        <div className="event-status-options">
          <label>
            <input
              type="radio"
              name="eventStatus"
              checked={formState.status === 'published'}
              onChange={() => updateField('status', 'published')}
            />
            <span>Published</span>
          </label>

          <label>
            <input
              type="radio"
              name="eventStatus"
              checked={formState.status === 'draft'}
              onChange={() => updateField('status', 'draft')}
            />
            <span>Draft</span>
          </label>

          {includeCancelledStatus ? (
            <label>
              <input
                type="radio"
                name="eventStatus"
                checked={formState.status === 'cancelled'}
                onChange={() => updateField('status', 'cancelled')}
              />
              <span>Cancelled</span>
            </label>
          ) : null}
        </div>
      </fieldset>

      <button
        type="submit"
        className="auth-submit-button"
        disabled={isSubmitting}
      >
        {isSubmitting ? submittingText : submitText}
      </button>
    </form>
  )
}

type OwnedEventCardProps = {
  event: StreetTeamEvent
  isCancelling: boolean
  isDeleting: boolean
  onCancelEvent: (event: StreetTeamEvent) => void
  onDeleteEvent: (event: StreetTeamEvent) => void
  onEditEvent: (event: StreetTeamEvent) => void
}

function OwnedEventCard({
  event,
  isCancelling,
  isDeleting,
  onCancelEvent,
  onDeleteEvent,
  onEditEvent,
}: OwnedEventCardProps) {
  const location = formatEventLocation(event)

  return (
    <article className="owned-event-card">
      {event.eventImageUrl ? (
        <div className="owned-event-image-frame">
          <img src={event.eventImageUrl} alt="" className="owned-event-image" />
        </div>
      ) : null}

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

      <div className="owned-event-actions">
        {event.status === 'published' ? (
          <Link to={`/events/${event.slug}`} className="secondary-action-button">
            View public event
          </Link>
        ) : null}

        <button
          type="button"
          className="secondary-action-button"
          onClick={() => onEditEvent(event)}
        >
          Edit Event
        </button>

        {event.status !== 'cancelled' ? (
          <button
            type="button"
            className="secondary-action-button"
            disabled={isCancelling}
            onClick={() => onCancelEvent(event)}
          >
            {isCancelling ? 'Cancelling...' : 'Cancel Event'}
          </button>
        ) : null}

        <button
          type="button"
          className="secondary-action-button"
          disabled={isDeleting}
          onClick={() => onDeleteEvent(event)}
        >
          {isDeleting ? 'Deleting...' : 'Delete Event'}
        </button>
      </div>
    </article>
  )
}

type OwnedEventEditCardProps = {
  event: StreetTeamEvent
  fileInputKey: number
  flyerFile: File | null
  formState: EventFormState
  isCancelling: boolean
  isDeleting: boolean
  isSaving: boolean
  onCancelEdit: () => void
  onCancelEvent: (event: StreetTeamEvent) => void
  onDeleteEvent: (event: StreetTeamEvent) => void
  onFileChange: (file: File | null) => void
  onFormChange: (formState: EventFormState) => void
  onSave: (event: FormEvent<HTMLFormElement>, eventId: string) => void
}

function OwnedEventEditCard({
  event,
  fileInputKey,
  flyerFile,
  formState,
  isCancelling,
  isDeleting,
  isSaving,
  onCancelEdit,
  onCancelEvent,
  onDeleteEvent,
  onFileChange,
  onFormChange,
  onSave,
}: OwnedEventEditCardProps) {
  return (
    <article className="owned-event-card owned-event-edit-card">
      <EventForm
        currentImageUrl={event.eventImageUrl}
        fileInputKey={fileInputKey}
        flyerFile={flyerFile}
        formState={formState}
        includeCancelledStatus
        isSubmitting={isSaving}
        onFileChange={onFileChange}
        onFormChange={onFormChange}
        onSubmit={(formEvent) => onSave(formEvent, event.id)}
        submitText="Save Changes"
        submittingText="Saving changes..."
      />

      <div className="owned-event-actions">
        <button
          type="button"
          className="secondary-action-button"
          disabled={isSaving}
          onClick={onCancelEdit}
        >
          Cancel
        </button>

        {event.status !== 'cancelled' ? (
          <button
            type="button"
            className="secondary-action-button"
            disabled={isCancelling || isSaving}
            onClick={() => onCancelEvent(event)}
          >
            {isCancelling ? 'Cancelling...' : 'Cancel Event'}
          </button>
        ) : null}

        <button
          type="button"
          className="secondary-action-button"
          disabled={isDeleting || isSaving}
          onClick={() => onDeleteEvent(event)}
        >
          {isDeleting ? 'Deleting...' : 'Delete Event'}
        </button>
      </div>
    </article>
  )
}

function getFormStateFromEvent(event: StreetTeamEvent): EventFormState {
  return {
    addressLine1: event.addressLine1,
    addressLine2: event.addressLine2,
    category: event.category,
    city: event.city,
    country: event.country || 'USA',
    description: event.description,
    doorsTime: event.doorsTime.slice(0, 5),
    endTime: event.endTime.slice(0, 5),
    eventDate: event.eventDate,
    postalCode: event.postalCode,
    startTime: event.startTime.slice(0, 5),
    state: event.state,
    status: event.status,
    title: event.title,
    venueName: event.venueName,
  }
}

export default EventManagementSection
