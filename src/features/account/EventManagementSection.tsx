import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react'
import { Link } from 'react-router-dom'
import EventTicketManager, {
  TicketSetupFields,
} from './EventTicketManager'
import EventTicketScanner from './EventTicketScanner'
import {
  emptyTicketForm,
  getTicketInput,
  type TicketFormState,
} from './ticketSetupForm'
import { uploadEventImage } from '../events/eventImages'
import EventDoorSalesManager from './EventDoorSalesManager'
import {
  createEventTicketType,
  fetchEventTicketCheckInSummary,
  fetchEventTicketTypes,
  fetchTicketReservationsForEvent,
  formatTicketPrice,
  type EventTicketCheckInSummary,
  type EventTicketType,
  type TicketReservation,
} from '../events/eventTickets'
import {
  createEventLineupEntry,
  deleteEventLineupEntry,
  fetchEventLineup,
  isDuplicateLineupPerformerError,
  sortEventLineup,
  updateEventLineupEntry,
  type EventLineupEntry,
} from '../events/eventLineups'
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
import {
  clearGoogleAutocompleteListeners,
  createPlaceAutocomplete,
  geocodeAddress,
  hasGoogleMapsApiKey,
  loadGoogleMaps,
  type ParsedGooglePlace,
} from '../location/googleMaps'
import {
  fetchPerformers,
  type Performer,
} from '../performers/performers'
import ProfileImageAvatar from '../profile-images/ProfileImageAvatar'

type EventManagementSectionProps = {
  organizerProfileId: string
  organizerType: EventOrganizerType
  ownerUserId: string
}

type EventFormState = EventFormInput

const defaultInitialTicketForm: TicketFormState = {
  ...emptyTicketForm,
  name: 'General Admission',
}

type EventMessage = {
  eventSlug?: string
  eventStatus?: EventStatus
  type: 'success' | 'error'
  text: string
}

type EventCreateDraft = {
  formState: EventFormState
  initialTicketFormState: TicketFormState
  savedAt: string
  shouldCreateInitialTicket: boolean
}

type EventEditDraft = {
  formState: EventFormState
  savedAt: string
}

type LocationSearchStatus = {
  type: 'info' | 'success' | 'error'
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
  formattedAddress: '',
  googlePlaceId: '',
  latitude: null,
  longitude: null,
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
  const createDraftKey = getEventCreateDraftKey(
    ownerUserId,
    organizerType,
    organizerProfileId,
  )
  const [events, setEvents] = useState<StreetTeamEvent[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [formState, setFormState] = useState<EventFormState>(emptyEventForm)
  const [initialTicketFormState, setInitialTicketFormState] =
    useState<TicketFormState>(defaultInitialTicketForm)
  const [shouldCreateInitialTicket, setShouldCreateInitialTicket] =
    useState(true)
  const [flyerFile, setFlyerFile] = useState<File | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)
  const [availableCreateDraft, setAvailableCreateDraft] =
    useState<EventCreateDraft | null>(() => loadEventCreateDraft(createDraftKey))
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [editFormState, setEditFormState] =
    useState<EventFormState>(emptyEventForm)
  const [editFlyerFile, setEditFlyerFile] = useState<File | null>(null)
  const [editFileInputKey, setEditFileInputKey] = useState(0)
  const [managedEventId, setManagedEventId] = useState<string | null>(null)
  const [checkInEventId, setCheckInEventId] = useState<string | null>(null)
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

  useEffect(() => {
    if (!isCreateFormOpen) {
      return
    }

    if (
      !hasCreateDraftContent(
        formState,
        initialTicketFormState,
        shouldCreateInitialTicket,
      )
    ) {
      removeEventDraft(createDraftKey)
      return
    }

    saveEventCreateDraft(createDraftKey, {
      formState,
      initialTicketFormState,
      savedAt: new Date().toISOString(),
      shouldCreateInitialTicket,
    })
  }, [
    createDraftKey,
    formState,
    initialTicketFormState,
    isCreateFormOpen,
    shouldCreateInitialTicket,
  ])

  useEffect(() => {
    if (!editingEventId) {
      return
    }

    const event = events.find(
      (currentEvent) => currentEvent.id === editingEventId,
    )

    if (!event) {
      return
    }

    const editDraftKey = getEventEditDraftKey(ownerUserId, editingEventId)

    if (!hasEditDraftContent(editFormState, event) && !editFlyerFile) {
      removeEventDraft(editDraftKey)
      return
    }

    saveEventEditDraft(editDraftKey, {
      formState: editFormState,
      savedAt: new Date().toISOString(),
    })
  }, [editFlyerFile, editFormState, editingEventId, events, ownerUserId])

  useEffect(() => {
    const activeEditedEvent = editingEventId
      ? events.find((event) => event.id === editingEventId)
      : null
    const hasUnsavedCreate =
      isCreateFormOpen &&
      (hasCreateDraftContent(
        formState,
        initialTicketFormState,
        shouldCreateInitialTicket,
      ) ||
        Boolean(flyerFile))
    const hasUnsavedEdit =
      Boolean(editingEventId && activeEditedEvent) &&
      ((activeEditedEvent
        ? hasEditDraftContent(editFormState, activeEditedEvent)
        : false) ||
        Boolean(editFlyerFile))

    if (!hasUnsavedCreate && !hasUnsavedEdit) {
      return
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [
    editFlyerFile,
    editFormState,
    editingEventId,
    events,
    flyerFile,
    formState,
    initialTicketFormState,
    isCreateFormOpen,
    shouldCreateInitialTicket,
  ])

  function resetCreateForm() {
    setFormState(emptyEventForm)
    setInitialTicketFormState(defaultInitialTicketForm)
    setShouldCreateInitialTicket(true)
    setFlyerFile(null)
    setFileInputKey((currentKey) => currentKey + 1)
  }

  function handleCreateNewEvent() {
    if (availableCreateDraft) {
      const shouldDiscardDraft = window.confirm(
        'Discard your saved event draft and start a blank event?',
      )

      if (!shouldDiscardDraft) {
        return
      }

      removeEventDraft(createDraftKey)
      setAvailableCreateDraft(null)
    }

    resetCreateForm()
    setMessage(null)
    setIsCreateFormOpen(true)
  }

  function handleResumeCreateDraft() {
    if (!availableCreateDraft) {
      return
    }

    setFormState(availableCreateDraft.formState)
    setInitialTicketFormState(availableCreateDraft.initialTicketFormState)
    setShouldCreateInitialTicket(availableCreateDraft.shouldCreateInitialTicket)
    setFlyerFile(null)
    setFileInputKey((currentKey) => currentKey + 1)
    setAvailableCreateDraft(null)
    setMessage(null)
    setIsCreateFormOpen(true)
  }

  function handleDiscardCreateDraft() {
    const shouldDiscardDraft = window.confirm('Discard this saved event draft?')

    if (!shouldDiscardDraft) {
      return
    }

    removeEventDraft(createDraftKey)
    setAvailableCreateDraft(null)
    resetCreateForm()
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsCreating(true)
    setMessage(null)

    const parsedInitialTicket = shouldCreateInitialTicket
      ? getTicketInput(initialTicketFormState)
      : null

    if (parsedInitialTicket?.type === 'error') {
      setMessage({
        type: 'error',
        text: parsedInitialTicket.message,
      })
      setIsCreating(false)
      return
    }

    try {
      const preparedEvent = await prepareEventInputForSave(formState)
      const createdEvent = await createEvent({
        ...preparedEvent.input,
        organizerProfileId,
        organizerType,
        ownerUserId,
      })

      let nextEvent = createdEvent
      let messageType: EventMessage['type'] = 'success'
      const createWarnings: string[] = []

      if (parsedInitialTicket?.type === 'success') {
        try {
          await createEventTicketType({
            ...parsedInitialTicket.input,
            eventId: createdEvent.id,
          })
        } catch (error) {
          messageType = 'error'
          createWarnings.push(
            error instanceof Error
              ? `Ticket setup could not be saved: ${error.message}`
              : 'Ticket setup could not be saved.',
          )
        }
      }

      if (flyerFile) {
        try {
          nextEvent = await saveEventFlyer(createdEvent, flyerFile)
        } catch (error) {
          messageType = 'error'
          createWarnings.push(
            error instanceof Error
              ? `Flyer could not be uploaded: ${error.message}`
              : 'Flyer could not be uploaded.',
          )
        }
      }

      setEvents((currentEvents) => [nextEvent, ...currentEvents])
      removeEventDraft(createDraftKey)
      setAvailableCreateDraft(null)
      resetCreateForm()
      setIsCreateFormOpen(false)
      setStatus('ready')
      setMessage({
        eventSlug: nextEvent.slug,
        eventStatus: nextEvent.status,
        type: messageType,
        text: joinMessage(
          nextEvent.status === 'published'
            ? 'Event published.'
            : 'Event saved as a draft.',
          [preparedEvent.warning, ...createWarnings].filter(Boolean).join(' '),
        ),
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

  function handleCreateFormCancel() {
    const hasUnsavedDraft =
      hasCreateDraftContent(
        formState,
        initialTicketFormState,
        shouldCreateInitialTicket,
      ) || Boolean(flyerFile)

    if (hasUnsavedDraft) {
      const shouldDiscardDraft = window.confirm('Discard this event draft?')

      if (!shouldDiscardDraft) {
        return
      }
    }

    removeEventDraft(createDraftKey)
    setAvailableCreateDraft(null)
    setIsCreateFormOpen(false)
    resetCreateForm()
  }

  function handleManageToggle(event: StreetTeamEvent) {
    const isClosingCurrentEvent = managedEventId === event.id

    setManagedEventId(isClosingCurrentEvent ? null : event.id)
    setEditingEventId(null)
    setEditFormState(emptyEventForm)
    setEditFlyerFile(null)
    setCheckInEventId((currentId) =>
      currentId === event.id ? null : currentId,
    )
    setMessage(null)
  }

  function handleEditStart(event: StreetTeamEvent) {
    const editDraftKey = getEventEditDraftKey(ownerUserId, event.id)
    const editDraft = loadEventEditDraft(editDraftKey)
    let nextFormState = getFormStateFromEvent(event)

    if (editDraft) {
      const shouldResumeDraft = window.confirm(
        `Resume unsaved edits for ${event.title}?`,
      )

      if (shouldResumeDraft) {
        nextFormState = editDraft.formState
      } else {
        removeEventDraft(editDraftKey)
      }
    }

    setManagedEventId(event.id)
    setEditingEventId(event.id)
    setCheckInEventId((currentId) =>
      currentId === event.id ? null : currentId,
    )
    setEditFormState(nextFormState)
    setEditFlyerFile(null)
    setEditFileInputKey((currentKey) => currentKey + 1)
    setMessage(null)
  }

  function handleEditCancel() {
    if (editingEventId) {
      const event = events.find(
        (currentEvent) => currentEvent.id === editingEventId,
      )
      const hasUnsavedEdit =
        (event ? hasEditDraftContent(editFormState, event) : false) ||
        Boolean(editFlyerFile)

      if (hasUnsavedEdit) {
        const shouldDiscardDraft = window.confirm('Discard unsaved edits?')

        if (!shouldDiscardDraft) {
          return
        }
      }

      removeEventDraft(getEventEditDraftKey(ownerUserId, editingEventId))
    }

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
      const preparedEvent = await prepareEventInputForSave(editFormState)
      updatedEvent = await updateEvent(ownerUserId, eventId, preparedEvent.input)

      const nextEvent = editFlyerFile
        ? await saveEventFlyer(updatedEvent, editFlyerFile)
        : updatedEvent

      setEvents((currentEvents) =>
        currentEvents.map((currentEvent) =>
          currentEvent.id === eventId ? nextEvent : currentEvent,
        ),
      )
      removeEventDraft(getEventEditDraftKey(ownerUserId, eventId))
      setEditingEventId(null)
      setEditFormState(emptyEventForm)
      setEditFlyerFile(null)
      setMessage({
        eventSlug: nextEvent.slug,
        eventStatus: nextEvent.status,
        type: 'success',
        text: joinMessage('Event updated.', preparedEvent.warning),
      })
    } catch (error) {
      if (updatedEvent) {
        const eventWithoutNewFlyer = updatedEvent

        setEvents((currentEvents) =>
          currentEvents.map((currentEvent) =>
            currentEvent.id === eventId ? eventWithoutNewFlyer : currentEvent,
          ),
        )
        removeEventDraft(getEventEditDraftKey(ownerUserId, eventId))
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
      removeEventDraft(getEventEditDraftKey(ownerUserId, event.id))
      setEvents((currentEvents) =>
        currentEvents.filter((currentEvent) => currentEvent.id !== event.id),
      )
      setEditingEventId((currentId) =>
        currentId === event.id ? null : currentId,
      )
      setManagedEventId((currentId) =>
        currentId === event.id ? null : currentId,
      )
      setCheckInEventId((currentId) =>
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

  const activeCheckInEvent =
    events.find((event) => event.id === checkInEventId) ?? null

  if (activeCheckInEvent) {
    return (
      <EventTicketScanner
        event={activeCheckInEvent}
        onBack={() => setCheckInEventId(null)}
      />
    )
  }

  return (
    <div className="event-management">
      <header className="event-management-heading">
        <h3>Your Events</h3>
        <p>Create official Street Team events for your account.</p>
      </header>

      <div className="event-management-actions">
        {isCreateFormOpen ? (
          <button
            type="button"
            className="secondary-action-button"
            disabled={isCreating}
            onClick={handleCreateFormCancel}
          >
            Cancel
          </button>
        ) : (
          <button
            type="button"
            className="auth-submit-button"
            onClick={handleCreateNewEvent}
          >
            Create New Event
          </button>
        )}
      </div>

      {availableCreateDraft && !isCreateFormOpen ? (
        <EventDraftRecovery
          draft={availableCreateDraft}
          onDiscard={handleDiscardCreateDraft}
          onResume={handleResumeCreateDraft}
        />
      ) : null}

      {isCreateFormOpen ? (
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
          ticketSetupSection={
            <InitialTicketSetupSection
              enabled={shouldCreateInitialTicket}
              formState={initialTicketFormState}
              onEnabledChange={setShouldCreateInitialTicket}
              onFormChange={setInitialTicketFormState}
            />
          }
        />
      ) : null}

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
          ? events.map((event) => {
              const isManaged = managedEventId === event.id

              return (
                <OwnedEventCard
                  key={event.id}
                  event={event}
                  isManaged={isManaged}
                  managePanel={
                    isManaged ? (
                      <OwnedEventManagePanel
                        event={event}
                        fileInputKey={editFileInputKey}
                        flyerFile={editFlyerFile}
                        formState={editFormState}
                        isCancelling={cancellingEventId === event.id}
                        isDeleting={deletingEventId === event.id}
                        isEditing={editingEventId === event.id}
                        isSaving={savingEventId === event.id}
                        onCancelEdit={handleEditCancel}
                        onCancelEvent={handleCancelEvent}
                        onDeleteEvent={handleDeleteEvent}
                        onFileChange={setEditFlyerFile}
                        onFormChange={setEditFormState}
                        onOpenScanner={() => setCheckInEventId(event.id)}
                        onSave={handleEditSave}
                        onStartEdit={handleEditStart}
                      />
                    ) : null
                  }
                  onManageEvent={handleManageToggle}
                />
              )
            })
          : null}
      </div>
    </div>
  )
}

type EventDraftRecoveryProps = {
  draft: EventCreateDraft
  onDiscard: () => void
  onResume: () => void
}

function EventDraftRecovery({
  draft,
  onDiscard,
  onResume,
}: EventDraftRecoveryProps) {
  return (
    <section className="event-draft-recovery">
      <div>
        <h4>Unsaved Event Draft</h4>
        <p>
          {draft.formState.title.trim() || 'Untitled event'} was saved on this
          device {formatDraftSavedAt(draft.savedAt)}.
        </p>
      </div>

      <div className="event-draft-actions">
        <button
          type="button"
          className="auth-submit-button"
          onClick={onResume}
        >
          Resume Draft
        </button>
        <button
          type="button"
          className="secondary-action-button"
          onClick={onDiscard}
        >
          Discard Draft
        </button>
      </div>
    </section>
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
  ticketSetupSection?: ReactNode
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
  ticketSetupSection = null,
}: EventFormProps) {
  const locationInputRef = useRef<HTMLInputElement | null>(null)
  const formStateRef = useRef(formState)
  const isGoogleMapsConfigured = hasGoogleMapsApiKey()
  const [locationSearch, setLocationSearch] = useState(() =>
    formatLocationSearchDefault(formState),
  )
  const [locationSearchStatus, setLocationSearchStatus] =
    useState<LocationSearchStatus | null>(() =>
      isGoogleMapsConfigured
        ? null
        : {
            type: 'info',
            text: 'Google Places is not configured, so use the address fields below.',
          },
    )

  useEffect(() => {
    formStateRef.current = formState
  }, [formState])

  useEffect(() => {
    const inputElement = locationInputRef.current
    let autocomplete: unknown = null
    let isMounted = true

    if (!inputElement) {
      return
    }

    if (!isGoogleMapsConfigured) {
      return
    }

    async function initializeAutocomplete() {
      setLocationSearchStatus({
        type: 'info',
        text: 'Loading Google Places...',
      })

      try {
        await loadGoogleMaps()

        if (!isMounted || !inputElement) {
          return
        }

        autocomplete = createPlaceAutocomplete(inputElement, (place) => {
          const nextFormState = getFormStateFromGooglePlace(
            formStateRef.current,
            place,
          )

          onFormChange(nextFormState)
          setLocationSearch(formatLocationSearchDefault(nextFormState))
          setLocationSearchStatus({
            type: 'success',
            text: 'Location selected from Google Places.',
          })
        })

        if (isMounted) {
          setLocationSearchStatus({
            type: 'info',
            text: 'Start typing a venue name or street address.',
          })
        }
      } catch (error) {
        if (isMounted) {
          setLocationSearchStatus({
            type: 'error',
            text:
              error instanceof Error
                ? error.message
                : 'Google Places could not be loaded.',
          })
        }
      }
    }

    void initializeAutocomplete()

    return () => {
      isMounted = false

      if (autocomplete) {
        clearGoogleAutocompleteListeners(autocomplete)
      }
    }
  }, [isGoogleMapsConfigured, onFormChange])

  function updateField<FieldName extends keyof EventFormState>(
    fieldName: FieldName,
    value: EventFormState[FieldName],
  ) {
    const shouldClearGoogleLocation = isManualLocationField(fieldName)

    onFormChange({
      ...formState,
      [fieldName]: value,
      ...(shouldClearGoogleLocation
        ? {
            formattedAddress: '',
            googlePlaceId: '',
            latitude: null,
            longitude: null,
          }
        : {}),
    })
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    onFileChange(event.currentTarget.files?.[0] ?? null)
  }

  function handleLocationSearchChange(event: ChangeEvent<HTMLInputElement>) {
    setLocationSearch(event.target.value)

    if (!isGoogleMapsConfigured) {
      return
    }

    setLocationSearchStatus({
      type: 'info',
      text: event.target.value.trim()
        ? 'Choose a Google Places suggestion or fill out the address fields below.'
        : 'Start typing a venue name or street address.',
    })
  }

  const locationHelperText = locationSearchStatus?.text ?? ''
  const locationHelperClassName = locationSearchStatus
    ? `location-autocomplete-helper is-${locationSearchStatus.type}`
    : 'location-autocomplete-helper'

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
        <span>Find venue or address</span>
        <input
          ref={locationInputRef}
          type="text"
          value={locationSearch}
          autoComplete="off"
          placeholder="Start typing a venue, street address, city, or ZIP"
          onChange={handleLocationSearchChange}
        />
        {locationHelperText ? (
          <small className={locationHelperClassName}>
            {locationHelperText}
          </small>
        ) : null}
      </label>

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
          <span>ZIP code</span>
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

      {ticketSetupSection}

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

type InitialTicketSetupSectionProps = {
  enabled: boolean
  formState: TicketFormState
  onEnabledChange: (enabled: boolean) => void
  onFormChange: (formState: TicketFormState) => void
}

function InitialTicketSetupSection({
  enabled,
  formState,
  onEnabledChange,
  onFormChange,
}: InitialTicketSetupSectionProps) {
  return (
    <section className="event-ticket-manager event-initial-ticket-setup">
      <header className="event-ticket-heading">
        <h4>Tickets</h4>
        <p>Create the first ticket type for this event.</p>
      </header>

      <label className="ticket-setup-toggle">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
        />
        <span>Create an initial ticket type now</span>
      </label>

      {enabled ? (
        <div className="ticket-type-form">
          <TicketSetupFields
            formState={formState}
            onFormChange={onFormChange}
            radioName="initialTicketKind"
          />
        </div>
      ) : (
        <p>Tickets can be added later from Box Office.</p>
      )}
    </section>
  )
}

type OwnedEventCardProps = {
  event: StreetTeamEvent
  isManaged: boolean
  managePanel: ReactNode
  onManageEvent: (event: StreetTeamEvent) => void
}

function OwnedEventCard({
  event,
  isManaged,
  managePanel,
  onManageEvent,
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
        <button
          type="button"
          aria-expanded={isManaged}
          className="auth-submit-button"
          onClick={() => onManageEvent(event)}
        >
          Manage
        </button>
      </div>

      {managePanel}
    </article>
  )
}

type OwnedEventManagePanelProps = {
  event: StreetTeamEvent
  fileInputKey: number
  flyerFile: File | null
  formState: EventFormState
  isCancelling: boolean
  isDeleting: boolean
  isEditing: boolean
  isSaving: boolean
  onCancelEdit: () => void
  onCancelEvent: (event: StreetTeamEvent) => void
  onDeleteEvent: (event: StreetTeamEvent) => void
  onFileChange: (file: File | null) => void
  onFormChange: (formState: EventFormState) => void
  onOpenScanner: () => void
  onSave: (event: FormEvent<HTMLFormElement>, eventId: string) => void
  onStartEdit: (event: StreetTeamEvent) => void
}

function OwnedEventManagePanel({
  event,
  fileInputKey,
  flyerFile,
  formState,
  isCancelling,
  isDeleting,
  isEditing,
  isSaving,
  onCancelEdit,
  onCancelEvent,
  onDeleteEvent,
  onFileChange,
  onFormChange,
  onOpenScanner,
  onSave,
  onStartEdit,
}: OwnedEventManagePanelProps) {
  return (
    <section className="event-manage-panel" aria-label={`Manage ${event.title}`}>
      <div className="event-manage-grid">
        <section className="event-manage-section">
          <header className="event-manage-section-heading">
            <span>Event Setup</span>
            <h4>Details, media, and lineup</h4>
            <p>Edit the public event page content and manage performers.</p>
          </header>

          <div className="event-manage-actions">
            {event.status === 'published' ? (
              <Link
                to={`/events/${event.slug}`}
                className="secondary-action-button"
              >
                View Public Event
              </Link>
            ) : null}

            {!isEditing ? (
              <button
                type="button"
                className="secondary-action-button"
                onClick={() => onStartEdit(event)}
              >
                Edit Event Details
              </button>
            ) : null}
          </div>

          {isEditing ? (
            <OwnedEventEditCard
              event={event}
              fileInputKey={fileInputKey}
              flyerFile={flyerFile}
              formState={formState}
              isSaving={isSaving}
              onCancelEdit={onCancelEdit}
              onFileChange={onFileChange}
              onFormChange={onFormChange}
              onSave={onSave}
            />
          ) : null}

          <EventLineupManager eventId={event.id} />
        </section>

        <section className="event-manage-section event-manage-section-wide">
          <header className="event-manage-section-heading">
            <span>Box Office</span>
            <h4>Tickets, sales, and check-ins</h4>
            <p>
              Manage ticket types, start door sales, and open the QR scanner.
            </p>
          </header>

          <div className="event-manage-actions">
            <button
              type="button"
              className="auth-submit-button"
              onClick={onOpenScanner}
            >
              Scan Tickets & Check In
            </button>
          </div>

          <EventTicketManager eventId={event.id} />
          <EventDoorSalesManager eventId={event.id} />
        </section>

        <EventAnalyticsSection eventId={event.id} />

        <section className="event-manage-section event-settings-section">
          <header className="event-manage-section-heading">
            <span>Settings</span>
            <h4>Administrative actions</h4>
            <p>Cancel or delete this event only when the change is intentional.</p>
          </header>

          <div className="event-settings-actions">
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
              className="secondary-action-button danger-action-button"
              disabled={isDeleting || isSaving}
              onClick={() => onDeleteEvent(event)}
            >
              {isDeleting ? 'Deleting...' : 'Delete Event'}
            </button>
          </div>
        </section>
      </div>
    </section>
  )
}

type OwnedEventEditCardProps = {
  event: StreetTeamEvent
  fileInputKey: number
  flyerFile: File | null
  formState: EventFormState
  isSaving: boolean
  onCancelEdit: () => void
  onFileChange: (file: File | null) => void
  onFormChange: (formState: EventFormState) => void
  onSave: (event: FormEvent<HTMLFormElement>, eventId: string) => void
}

function OwnedEventEditCard({
  event,
  fileInputKey,
  flyerFile,
  formState,
  isSaving,
  onCancelEdit,
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
      </div>
    </article>
  )
}

type EventAnalyticsData = {
  checkInSummary: EventTicketCheckInSummary
  confirmedReservations: TicketReservation[]
  doorTicketCount: number
  grossCheckoutTotalCents: number
  onlineTicketCount: number
  pendingReservationCount: number
  signedInFanTicketCount: number
  guestTicketCount: number
  ticketCapacity: number
  ticketTypeCount: number
}

function EventAnalyticsSection({ eventId }: { eventId: string }) {
  const [analytics, setAnalytics] = useState<EventAnalyticsData | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )

  useEffect(() => {
    let isMounted = true

    async function loadAnalytics() {
      setStatus('loading')

      try {
        const [ticketTypes, reservations, checkInSummary] = await Promise.all([
          fetchEventTicketTypes(eventId),
          fetchTicketReservationsForEvent(eventId),
          fetchEventTicketCheckInSummary(eventId),
        ])

        if (!isMounted) {
          return
        }

        setAnalytics(
          buildEventAnalytics(ticketTypes, reservations, checkInSummary),
        )
        setStatus('ready')
      } catch {
        if (isMounted) {
          setStatus('error')
        }
      }
    }

    void loadAnalytics()

    return () => {
      isMounted = false
    }
  }, [eventId])

  return (
    <section className="event-manage-section">
      <header className="event-manage-section-heading">
        <span>Analytics</span>
        <h4>Sales and check-ins</h4>
        <p>Basic event activity from ticket reservations and QR scans.</p>
      </header>

      {status === 'loading' ? <p>Loading analytics...</p> : null}
      {status === 'error' ? (
        <p>Analytics could not be loaded right now.</p>
      ) : null}

      {status === 'ready' && analytics ? (
        <div className="event-analytics-grid">
          <EventAnalyticsMetric
            label="Tickets sold"
            value={analytics.confirmedReservations
              .reduce((total, reservation) => total + reservation.quantity, 0)
              .toLocaleString()}
            detail="Paid and free confirmed tickets"
          />
          <EventAnalyticsMetric
            label="Tickets remaining"
            value={formatRemainingTickets(analytics)}
            detail="Based on ticket capacity"
          />
          <EventAnalyticsMetric
            label="Gross checkout total"
            value={formatTicketPrice(analytics.grossCheckoutTotalCents)}
            detail="Confirmed paid checkout totals"
          />
          <EventAnalyticsMetric
            label="Check-ins"
            value={analytics.checkInSummary.checkedInTickets.toLocaleString()}
            detail={`${analytics.checkInSummary.notCheckedInTickets.toLocaleString()} not checked in`}
          />
          <EventAnalyticsMetric
            label="Guest purchases"
            value={analytics.guestTicketCount.toLocaleString()}
            detail="Tickets without a fan account"
          />
          <EventAnalyticsMetric
            label="Signed-in fan purchases"
            value={analytics.signedInFanTicketCount.toLocaleString()}
            detail="Tickets tied to fan accounts"
          />
          <EventAnalyticsMetric
            label="Door sales"
            value={analytics.doorTicketCount.toLocaleString()}
            detail="Paid box office tickets"
          />
          <EventAnalyticsMetric
            label="Online sales"
            value={analytics.onlineTicketCount.toLocaleString()}
            detail="Public checkout tickets"
          />
          <EventAnalyticsMetric
            label="Pending reservations"
            value={analytics.pendingReservationCount.toLocaleString()}
            detail="Waiting on payment or completion"
          />
        </div>
      ) : null}
    </section>
  )
}

function EventAnalyticsMetric({
  detail,
  label,
  value,
}: {
  detail: string
  label: string
  value: string
}) {
  return (
    <div className="event-analytics-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
  )
}

function buildEventAnalytics(
  ticketTypes: EventTicketType[],
  reservations: TicketReservation[],
  checkInSummary: EventTicketCheckInSummary,
): EventAnalyticsData {
  const confirmedReservations = reservations.filter(
    (reservation) => reservation.reservationStatus === 'confirmed',
  )

  return {
    checkInSummary,
    confirmedReservations,
    doorTicketCount: sumReservationQuantity(
      confirmedReservations.filter(
        (reservation) => reservation.salesChannel === 'door',
      ),
    ),
    grossCheckoutTotalCents: confirmedReservations.reduce(
      (total, reservation) =>
        total + Math.max(0, reservation.totalPriceCentsSnapshot),
      0,
    ),
    guestTicketCount: sumReservationQuantity(
      confirmedReservations.filter(
        (reservation) => !reservation.purchaserUserId,
      ),
    ),
    onlineTicketCount: sumReservationQuantity(
      confirmedReservations.filter(
        (reservation) => reservation.salesChannel === 'online',
      ),
    ),
    pendingReservationCount: reservations.filter(
      (reservation) => reservation.reservationStatus === 'pending',
    ).length,
    signedInFanTicketCount: sumReservationQuantity(
      confirmedReservations.filter(
        (reservation) => Boolean(reservation.purchaserUserId),
      ),
    ),
    ticketCapacity: ticketTypes.reduce(
      (total, ticketType) => total + ticketType.quantityTotal,
      0,
    ),
    ticketTypeCount: ticketTypes.length,
  }
}

function sumReservationQuantity(reservations: TicketReservation[]) {
  return reservations.reduce(
    (total, reservation) => total + reservation.quantity,
    0,
  )
}

function formatRemainingTickets(analytics: EventAnalyticsData) {
  if (analytics.ticketTypeCount === 0 || analytics.ticketCapacity <= 0) {
    return 'Not set'
  }

  const ticketsSold = sumReservationQuantity(analytics.confirmedReservations)

  return Math.max(analytics.ticketCapacity - ticketsSold, 0).toLocaleString()
}

type LineupFormState = {
  displayOrder: string
  lineupRole: string
  performerId: string
}

type LineupMessage = {
  type: 'success' | 'error'
  text: string
}

const emptyLineupForm: LineupFormState = {
  displayOrder: '0',
  lineupRole: '',
  performerId: '',
}

function EventLineupManager({ eventId }: { eventId: string }) {
  const [availablePerformers, setAvailablePerformers] = useState<Performer[]>(
    [],
  )
  const [lineup, setLineup] = useState<EventLineupEntry[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [formState, setFormState] = useState<LineupFormState>(emptyLineupForm)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [editFormState, setEditFormState] =
    useState<Omit<LineupFormState, 'displayOrder' | 'performerId'>>({
      lineupRole: '',
    })
  const [message, setMessage] = useState<LineupMessage | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [savingEntryId, setSavingEntryId] = useState<string | null>(null)
  const [removingEntryId, setRemovingEntryId] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadLineupManager() {
      setStatus('loading')

      try {
        const [performers, nextLineup] = await Promise.all([
          fetchPerformers(),
          fetchEventLineup(eventId),
        ])

        if (isMounted) {
          setAvailablePerformers(
            performers.sort((first, second) =>
              first.name.localeCompare(second.name),
            ),
          )
          setLineup(nextLineup)
          setStatus('ready')
        }
      } catch {
        if (isMounted) {
          setStatus('error')
        }
      }
    }

    void loadLineupManager()

    return () => {
      isMounted = false
    }
  }, [eventId])

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!formState.performerId) {
      setMessage({
        type: 'error',
        text: 'Choose a performer before adding them to the lineup.',
      })
      return
    }

    if (
      lineup.some((entry) => entry.performerId === formState.performerId)
    ) {
      setMessage({
        type: 'error',
        text: 'That performer is already attached to this event.',
      })
      return
    }

    setIsAdding(true)
    setMessage(null)

    try {
      const nextEntry = await createEventLineupEntry({
        displayOrder: formState.displayOrder,
        eventId,
        lineupRole: formState.lineupRole,
        performerId: formState.performerId,
      })

      setLineup((currentLineup) =>
        sortEventLineup([...currentLineup, nextEntry]),
      )
      setFormState(emptyLineupForm)
      setMessage({
        type: 'success',
        text: 'Performer added to lineup.',
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text: isDuplicateLineupPerformerError(error)
          ? 'That performer is already attached to this event.'
          : error instanceof Error
            ? error.message
            : 'Performer could not be added. Please try again.',
      })
    } finally {
      setIsAdding(false)
    }
  }

  function handleEditStart(entry: EventLineupEntry) {
    setEditingEntryId(entry.id)
    setEditFormState({
      lineupRole: entry.lineupRole,
    })
    setMessage(null)
  }

  function handleEditCancel() {
    setEditingEntryId(null)
    setEditFormState({
      lineupRole: '',
    })
    setMessage(null)
  }

  async function handleEditSave(
    event: FormEvent<HTMLFormElement>,
    entry: EventLineupEntry,
  ) {
    event.preventDefault()
    setSavingEntryId(entry.id)
    setMessage(null)

    try {
      const nextEntry = await updateEventLineupEntry(eventId, entry.id, {
        displayOrder: String(entry.displayOrder),
        lineupRole: editFormState.lineupRole,
      })

      setLineup((currentLineup) =>
        sortEventLineup(
          currentLineup.map((currentEntry) =>
            currentEntry.id === entry.id ? nextEntry : currentEntry,
          ),
        ),
      )
      setEditingEntryId(null)
      setMessage({
        type: 'success',
        text: 'Lineup entry updated.',
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Lineup entry could not be updated. Please try again.',
      })
    } finally {
      setSavingEntryId(null)
    }
  }

  async function handleRemove(entry: EventLineupEntry) {
    const shouldRemove = window.confirm(
      `Remove ${entry.performer?.name ?? 'this performer'} from the lineup?`,
    )

    if (!shouldRemove) {
      return
    }

    setRemovingEntryId(entry.id)
    setMessage(null)

    try {
      await deleteEventLineupEntry(eventId, entry.id)
      setLineup((currentLineup) =>
        currentLineup.filter((currentEntry) => currentEntry.id !== entry.id),
      )
      setMessage({
        type: 'success',
        text: 'Performer removed from lineup.',
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Performer could not be removed. Please try again.',
      })
    } finally {
      setRemovingEntryId(null)
    }
  }

  return (
    <div className="event-lineup-manager">
      <header className="event-lineup-heading">
        <h4>Lineup</h4>
        <p>Add performers attached to this official event.</p>
      </header>

      {status === 'loading' ? <p>Loading lineup...</p> : null}
      {status === 'error' ? <p>Lineup could not be loaded.</p> : null}

      {status === 'ready' ? (
        <>
          <form className="event-lineup-form" onSubmit={handleAdd}>
            <label>
              <span>Performer</span>
              <select
                value={formState.performerId}
                onChange={(event) =>
                  setFormState((currentState) => ({
                    ...currentState,
                    performerId: event.target.value,
                  }))
                }
              >
                <option value="">Choose a performer</option>
                {availablePerformers.map((performer) => (
                  <option key={performer.id} value={performer.id}>
                    {performer.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Lineup role</span>
              <input
                type="text"
                value={formState.lineupRole}
                placeholder="Headliner, Host, DJ..."
                onChange={(event) =>
                  setFormState((currentState) => ({
                    ...currentState,
                    lineupRole: event.target.value,
                  }))
                }
              />
            </label>

            <button
              type="submit"
              className="auth-submit-button"
              disabled={isAdding}
            >
              {isAdding ? 'Adding performer...' : 'Add Performer'}
            </button>
          </form>

          {message ? (
            <p className={`auth-message ${message.type}`}>{message.text}</p>
          ) : null}

          {lineup.length === 0 ? <p>No performers added yet.</p> : null}

          {lineup.length > 0 ? (
            <div className="lineup-list">
              {lineup.map((entry) =>
                editingEntryId === entry.id ? (
                  <form
                    key={entry.id}
                    className="lineup-card lineup-edit-card"
                    onSubmit={(event) => handleEditSave(event, entry)}
                  >
                    <LineupPerformerSummary entry={entry} />

                    <label>
                      <span>Lineup role</span>
                      <input
                        type="text"
                        value={editFormState.lineupRole}
                        onChange={(event) =>
                          setEditFormState({
                            lineupRole: event.target.value,
                          })
                        }
                      />
                    </label>

                    <div className="owned-event-actions">
                      <button
                        type="submit"
                        className="auth-submit-button"
                        disabled={savingEntryId === entry.id}
                      >
                        {savingEntryId === entry.id
                          ? 'Saving...'
                          : 'Save Lineup'}
                      </button>

                      <button
                        type="button"
                        className="secondary-action-button"
                        disabled={savingEntryId === entry.id}
                        onClick={handleEditCancel}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <article key={entry.id} className="lineup-card">
                    <LineupPerformerSummary entry={entry} />

                    <div className="owned-event-actions">
                      <button
                        type="button"
                        className="secondary-action-button"
                        onClick={() => handleEditStart(entry)}
                      >
                        Edit Lineup
                      </button>

                      <button
                        type="button"
                        className="secondary-action-button"
                        disabled={removingEntryId === entry.id}
                        onClick={() => {
                          void handleRemove(entry)
                        }}
                      >
                        {removingEntryId === entry.id
                          ? 'Removing...'
                          : 'Remove'}
                      </button>
                    </div>
                  </article>
                ),
              )}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

function LineupPerformerSummary({ entry }: { entry: EventLineupEntry }) {
  if (!entry.performer) {
    return (
      <div className="lineup-copy">
        <h4>Performer unavailable</h4>
      </div>
    )
  }

  return (
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
        <Link to={`/performers/${entry.performer.slug}`}>
          View performer profile
        </Link>
      </div>
    </div>
  )
}

const eventFormFields: (keyof EventFormState)[] = [
  'addressLine1',
  'addressLine2',
  'category',
  'city',
  'country',
  'description',
  'doorsTime',
  'endTime',
  'eventDate',
  'formattedAddress',
  'googlePlaceId',
  'latitude',
  'longitude',
  'postalCode',
  'startTime',
  'state',
  'status',
  'title',
  'venueName',
]

const ticketFormFields: (keyof TicketFormState)[] = [
  'description',
  'name',
  'priceDollars',
  'quantityTotal',
  'ticketKind',
]

function getEventCreateDraftKey(
  ownerUserId: string,
  organizerType: EventOrganizerType,
  organizerProfileId: string,
) {
  return [
    'street-team',
    'event-create-draft',
    'v1',
    ownerUserId,
    organizerType,
    organizerProfileId,
  ].join(':')
}

function getEventEditDraftKey(ownerUserId: string, eventId: string) {
  return ['street-team', 'event-edit-draft', 'v1', ownerUserId, eventId].join(
    ':',
  )
}

function loadEventCreateDraft(key: string): EventCreateDraft | null {
  const draft = readJsonFromLocalStorage<EventCreateDraft>(key)

  if (!draft?.formState || !draft.initialTicketFormState) {
    return null
  }

  return {
    formState: normalizeEventFormState(draft.formState),
    initialTicketFormState: normalizeTicketFormState(
      draft.initialTicketFormState,
    ),
    savedAt: typeof draft.savedAt === 'string' ? draft.savedAt : '',
    shouldCreateInitialTicket: draft.shouldCreateInitialTicket !== false,
  }
}

function saveEventCreateDraft(key: string, draft: EventCreateDraft) {
  writeJsonToLocalStorage(key, draft)
}

function loadEventEditDraft(key: string): EventEditDraft | null {
  const draft = readJsonFromLocalStorage<EventEditDraft>(key)

  if (!draft?.formState) {
    return null
  }

  return {
    formState: normalizeEventFormState(draft.formState),
    savedAt: typeof draft.savedAt === 'string' ? draft.savedAt : '',
  }
}

function saveEventEditDraft(key: string, draft: EventEditDraft) {
  writeJsonToLocalStorage(key, draft)
}

function removeEventDraft(key: string) {
  if (!canUseLocalStorage()) {
    return
  }

  window.localStorage.removeItem(key)
}

function hasCreateDraftContent(
  formState: EventFormState,
  initialTicketFormState: TicketFormState,
  shouldCreateInitialTicket: boolean,
) {
  return (
    !areEventFormsEqual(formState, emptyEventForm) ||
    !areTicketFormsEqual(initialTicketFormState, defaultInitialTicketForm) ||
    shouldCreateInitialTicket !== true
  )
}

function hasEditDraftContent(
  formState: EventFormState,
  event: StreetTeamEvent,
) {
  return !areEventFormsEqual(formState, getFormStateFromEvent(event))
}

function areEventFormsEqual(
  firstFormState: EventFormState,
  secondFormState: EventFormState,
) {
  return eventFormFields.every(
    (fieldName) => firstFormState[fieldName] === secondFormState[fieldName],
  )
}

function areTicketFormsEqual(
  firstFormState: TicketFormState,
  secondFormState: TicketFormState,
) {
  return ticketFormFields.every(
    (fieldName) => firstFormState[fieldName] === secondFormState[fieldName],
  )
}

function normalizeEventFormState(input: Partial<EventFormState>): EventFormState {
  return {
    ...emptyEventForm,
    ...input,
    country: input.country ?? emptyEventForm.country,
    latitude:
      typeof input.latitude === 'number' && Number.isFinite(input.latitude)
        ? input.latitude
        : null,
    longitude:
      typeof input.longitude === 'number' && Number.isFinite(input.longitude)
        ? input.longitude
        : null,
    status:
      input.status === 'draft' ||
      input.status === 'published' ||
      input.status === 'cancelled'
        ? input.status
        : emptyEventForm.status,
  }
}

function normalizeTicketFormState(
  input: Partial<TicketFormState>,
): TicketFormState {
  return {
    ...defaultInitialTicketForm,
    ...input,
    ticketKind: input.ticketKind === 'paid' ? 'paid' : 'free',
  }
}

function readJsonFromLocalStorage<Value>(key: string): Value | null {
  if (!canUseLocalStorage()) {
    return null
  }

  const rawValue = window.localStorage.getItem(key)

  if (!rawValue) {
    return null
  }

  try {
    return JSON.parse(rawValue) as Value
  } catch {
    removeEventDraft(key)
    return null
  }
}

function writeJsonToLocalStorage<Value>(key: string, value: Value) {
  if (!canUseLocalStorage()) {
    return
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    window.localStorage.removeItem(key)
  }
}

function canUseLocalStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function formatDraftSavedAt(value: string) {
  if (!value) {
    return 'recently'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'recently'
  }

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
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
    formattedAddress: event.formattedAddress,
    googlePlaceId: event.googlePlaceId,
    latitude: event.latitude,
    longitude: event.longitude,
    postalCode: event.postalCode,
    startTime: event.startTime.slice(0, 5),
    state: event.state,
    status: event.status,
    title: event.title,
    venueName: event.venueName,
  }
}

async function prepareEventInputForSave(input: EventFormState) {
  if (hasCoordinates(input)) {
    return {
      input,
      warning: '',
    }
  }

  const geocodeAddressText = formatGeocodeAddress(input)

  if (!geocodeAddressText) {
    return {
      input: clearGoogleLocation(input),
      warning: '',
    }
  }

  if (!hasGoogleMapsApiKey()) {
    return {
      input: clearGoogleLocation(input),
      warning:
        'Location was saved, but coordinates were not added because Google Maps is not configured.',
    }
  }

  try {
    const place = await geocodeAddress(geocodeAddressText)

    if (
      typeof place?.latitude !== 'number' ||
      typeof place.longitude !== 'number'
    ) {
      return {
        input: clearGoogleLocation(input),
        warning:
          'Location was saved, but Google could not find coordinates for that address.',
      }
    }

    return {
      input: getFormStateFromGooglePlace(input, place),
      warning: '',
    }
  } catch {
    return {
      input: clearGoogleLocation(input),
      warning:
        'Location was saved, but Google could not find coordinates for that address.',
    }
  }
}

function getFormStateFromGooglePlace(
  currentFormState: EventFormState,
  place: ParsedGooglePlace,
): EventFormState {
  return {
    ...currentFormState,
    addressLine1: place.addressLine1 || currentFormState.addressLine1,
    addressLine2: '',
    city: place.city || currentFormState.city,
    country: place.country || currentFormState.country || 'USA',
    formattedAddress: place.formattedAddress,
    googlePlaceId: place.googlePlaceId,
    latitude: place.latitude,
    longitude: place.longitude,
    postalCode: place.postalCode || currentFormState.postalCode,
    state: place.state || currentFormState.state,
    venueName: place.venueName || currentFormState.venueName,
  }
}

function clearGoogleLocation(input: EventFormState): EventFormState {
  return {
    ...input,
    formattedAddress: '',
    googlePlaceId: '',
    latitude: null,
    longitude: null,
  }
}

function hasCoordinates(input: EventFormState) {
  return (
    typeof input.latitude === 'number' &&
    Number.isFinite(input.latitude) &&
    typeof input.longitude === 'number' &&
    Number.isFinite(input.longitude)
  )
}

function formatGeocodeAddress(input: EventFormState) {
  return [
    input.venueName,
    input.addressLine1,
    input.addressLine2,
    input.city,
    input.state,
    input.postalCode,
    input.country,
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ')
}

function formatLocationSearchDefault(input: EventFormState) {
  return (
    input.formattedAddress ||
    [input.venueName, input.addressLine1, input.city, input.state]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(', ')
  )
}

function isManualLocationField(fieldName: keyof EventFormState) {
  return [
    'addressLine1',
    'addressLine2',
    'city',
    'country',
    'postalCode',
    'state',
    'venueName',
  ].includes(fieldName)
}

function joinMessage(message: string, detail: string) {
  return detail ? `${message} ${detail}` : message
}

export default EventManagementSection
