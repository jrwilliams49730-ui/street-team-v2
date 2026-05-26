import {
  useEffect,
  useRef,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react'
import GooglePlacesAutocomplete from '../location/GooglePlacesAutocomplete'
import type { ParsedGooglePlace } from '../location/googleMaps'
import type { EventOrganizerType } from './events'
import {
  formatEventLocationSearchDefault,
  getEventFormStateFromGooglePlace,
  type EventFormState,
} from './eventFormLocation'

type EventDetailsFormProps = {
  currentImageUrl?: string | null
  fileInputKey: number
  flyerFile: File | null
  formMode: 'create' | 'edit'
  formState: EventFormState
  includeCancelledStatus: boolean
  isSubmitting: boolean
  onFileChange: (file: File | null) => void
  onFormChange: (formState: EventFormState) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  organizerType: EventOrganizerType
  submitText: string
  submittingText: string
  ticketSetupSection?: ReactNode
}

function EventDetailsForm({
  currentImageUrl,
  fileInputKey,
  flyerFile,
  formMode,
  formState,
  includeCancelledStatus,
  isSubmitting,
  onFileChange,
  onFormChange,
  onSubmit,
  organizerType,
  submitText,
  submittingText,
  ticketSetupSection = null,
}: EventDetailsFormProps) {
  const formStateRef = useRef(formState)

  useEffect(() => {
    formStateRef.current = formState
  }, [formState])

  useEffect(() => {
    logSharedEventFormLoaded(organizerType, formMode)
  }, [formMode, organizerType])

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

  function handlePlaceSelected(place: ParsedGooglePlace) {
    const nextFormState = getEventFormStateFromGooglePlace(
      formStateRef.current,
      place,
    )

    onFormChange(nextFormState)

    return formatEventLocationSearchDefault(nextFormState)
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

      <GooglePlacesAutocomplete
        accountType={organizerType}
        initialValue={formatEventLocationSearchDefault(formState)}
        onPlaceSelected={handlePlaceSelected}
      />

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

function logSharedEventFormLoaded(
  organizerType: EventOrganizerType,
  formMode: 'create' | 'edit',
) {
  if (!import.meta.env.DEV) {
    return
  }

  console.info('[Street Team Shared Event Form]', 'shared event form loaded', {
    accountTypeUsingEventForm: organizerType,
    formMode,
    sharedEventFormLoaded: true,
  })
}

export default EventDetailsForm
