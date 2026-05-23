import { useEffect, useState, type FormEvent } from 'react'
import {
  createEventTicketType,
  deleteEventTicketType,
  fetchEventTicketTypes,
  formatTicketKind,
  formatTicketPrice,
  updateEventTicketType,
  type EventTicketType,
  type TicketKind,
} from '../events/eventTickets'
import {
  emptyTicketForm,
  getTicketInput,
  type TicketFormState,
} from './ticketSetupForm'

type EventTicketManagerProps = {
  eventId: string
}

type TicketMessage = {
  type: 'success' | 'error'
  text: string
}

function EventTicketManager({ eventId }: EventTicketManagerProps) {
  const [ticketTypes, setTicketTypes] = useState<EventTicketType[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [formState, setFormState] = useState<TicketFormState>(emptyTicketForm)
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null)
  const [editFormState, setEditFormState] =
    useState<TicketFormState>(emptyTicketForm)
  const [message, setMessage] = useState<TicketMessage | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [savingTicketId, setSavingTicketId] = useState<string | null>(null)
  const [deletingTicketId, setDeletingTicketId] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadTicketTypes() {
      setStatus('loading')

      try {
        const nextTicketTypes = await fetchEventTicketTypes(eventId)

        if (isMounted) {
          setTicketTypes(nextTicketTypes)
          setStatus('ready')
        }
      } catch {
        if (isMounted) {
          setStatus('error')
        }
      }
    }

    void loadTicketTypes()

    return () => {
      isMounted = false
    }
  }, [eventId])

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsedInput = getTicketInput(formState)

    if (parsedInput.type === 'error') {
      setMessage({
        type: 'error',
        text: parsedInput.message,
      })
      return
    }

    setIsCreating(true)
    setMessage(null)

    try {
      const nextTicketType = await createEventTicketType({
        ...parsedInput.input,
        eventId,
      })

      setTicketTypes((currentTicketTypes) => [
        nextTicketType,
        ...currentTicketTypes,
      ])
      setFormState(emptyTicketForm)
      setStatus('ready')
      setMessage({
        type: 'success',
        text: 'Ticket type created.',
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Ticket type could not be created. Please try again.',
      })
    } finally {
      setIsCreating(false)
    }
  }

  function handleEditStart(ticketType: EventTicketType) {
    setEditingTicketId(ticketType.id)
    setEditFormState(getFormStateFromTicketType(ticketType))
    setMessage(null)
  }

  function handleEditCancel() {
    setEditingTicketId(null)
    setEditFormState(emptyTicketForm)
    setMessage(null)
  }

  async function handleEditSave(
    event: FormEvent<HTMLFormElement>,
    ticketTypeId: string,
  ) {
    event.preventDefault()

    const parsedInput = getTicketInput(editFormState)

    if (parsedInput.type === 'error') {
      setMessage({
        type: 'error',
        text: parsedInput.message,
      })
      return
    }

    setSavingTicketId(ticketTypeId)
    setMessage(null)

    try {
      const nextTicketType = await updateEventTicketType(
        eventId,
        ticketTypeId,
        parsedInput.input,
      )

      setTicketTypes((currentTicketTypes) =>
        currentTicketTypes.map((ticketType) =>
          ticketType.id === ticketTypeId ? nextTicketType : ticketType,
        ),
      )
      setEditingTicketId(null)
      setEditFormState(emptyTicketForm)
      setMessage({
        type: 'success',
        text: 'Ticket type updated.',
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Ticket type could not be updated. Please try again.',
      })
    } finally {
      setSavingTicketId(null)
    }
  }

  async function handleDelete(ticketType: EventTicketType) {
    const shouldDelete = window.confirm(`Delete ${ticketType.name}?`)

    if (!shouldDelete) {
      return
    }

    setDeletingTicketId(ticketType.id)
    setMessage(null)

    try {
      await deleteEventTicketType(eventId, ticketType.id)
      setTicketTypes((currentTicketTypes) =>
        currentTicketTypes.filter(
          (currentTicketType) => currentTicketType.id !== ticketType.id,
        ),
      )
      setMessage({
        type: 'success',
        text: 'Ticket type deleted.',
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Ticket type could not be deleted. Please try again.',
      })
    } finally {
      setDeletingTicketId(null)
    }
  }

  return (
    <div className="event-ticket-manager">
      <header className="event-ticket-heading">
        <h4>Tickets</h4>
        <p>Configure ticket types for this event.</p>
      </header>

      {status === 'loading' ? <p>Loading ticket types...</p> : null}
      {status === 'error' ? <p>Ticket types could not be loaded.</p> : null}

      {status === 'ready' ? (
        <>
          <TicketForm
            formState={formState}
            isSubmitting={isCreating}
            onFormChange={setFormState}
            onSubmit={handleCreate}
            submitText="Add Ticket Type"
            submittingText="Adding ticket type..."
          />

          {message ? (
            <p className={`auth-message ${message.type}`}>{message.text}</p>
          ) : null}

          {ticketTypes.length === 0 ? <p>No ticket types added yet.</p> : null}

          {ticketTypes.length > 0 ? (
            <div className="ticket-type-list">
              {ticketTypes.map((ticketType) =>
                editingTicketId === ticketType.id ? (
                  <article
                    key={ticketType.id}
                    className="ticket-type-card ticket-type-edit-card"
                  >
                    <TicketForm
                      formState={editFormState}
                      isSubmitting={savingTicketId === ticketType.id}
                      onFormChange={setEditFormState}
                      onSubmit={(event) =>
                        handleEditSave(event, ticketType.id)
                      }
                      submitText="Save Changes"
                      submittingText="Saving changes..."
                    />

                    <button
                      type="button"
                      className="secondary-action-button"
                      disabled={savingTicketId === ticketType.id}
                      onClick={handleEditCancel}
                    >
                      Cancel
                    </button>
                  </article>
                ) : (
                  <TicketTypeCard
                    key={ticketType.id}
                    isDeleting={deletingTicketId === ticketType.id}
                    onDelete={handleDelete}
                    onEdit={handleEditStart}
                    ticketType={ticketType}
                  />
                ),
              )}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

type TicketFormProps = {
  formState: TicketFormState
  isSubmitting: boolean
  onFormChange: (formState: TicketFormState) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  submitText: string
  submittingText: string
}

type TicketSetupFieldsProps = {
  formState: TicketFormState
  onFormChange: (formState: TicketFormState) => void
  radioName?: string
}

export function TicketSetupFields({
  formState,
  onFormChange,
  radioName = 'ticketKind',
}: TicketSetupFieldsProps) {
  function updateField<FieldName extends keyof TicketFormState>(
    fieldName: FieldName,
    value: TicketFormState[FieldName],
  ) {
    onFormChange({
      ...formState,
      [fieldName]: value,
    })
  }

  function handleTicketKindChange(ticketKind: TicketKind) {
    onFormChange({
      ...formState,
      priceDollars: ticketKind === 'free' ? '' : formState.priceDollars,
      ticketKind,
    })
  }

  return (
    <>
      <label>
        <span>Ticket name</span>
        <input
          type="text"
          value={formState.name}
          placeholder="General Admission"
          onChange={(event) => updateField('name', event.target.value)}
          required
        />
      </label>

      <label>
        <span>Ticket description</span>
        <textarea
          value={formState.description}
          rows={3}
          onChange={(event) => updateField('description', event.target.value)}
        />
      </label>

      <fieldset className="ticket-kind-field">
        <legend>Ticket kind</legend>

        <div className="ticket-kind-options">
          <label>
            <input
              type="radio"
              name={radioName}
              checked={formState.ticketKind === 'free'}
              onChange={() => handleTicketKindChange('free')}
            />
            <span>Free</span>
          </label>

          <label>
            <input
              type="radio"
              name={radioName}
              checked={formState.ticketKind === 'paid'}
              onChange={() => handleTicketKindChange('paid')}
            />
            <span>Paid</span>
          </label>
        </div>
      </fieldset>

      {formState.ticketKind === 'paid' ? (
        <label>
          <span>Price</span>
          <input
            type="text"
            inputMode="decimal"
            value={formState.priceDollars}
            placeholder="15.00"
            onChange={(event) => updateField('priceDollars', event.target.value)}
            required
          />
        </label>
      ) : null}

      <label>
        <span>Quantity available</span>
        <input
          type="number"
          min={1}
          step={1}
          value={formState.quantityTotal}
          onChange={(event) => updateField('quantityTotal', event.target.value)}
          required
        />
      </label>
    </>
  )
}

function TicketForm({
  formState,
  isSubmitting,
  onFormChange,
  onSubmit,
  submitText,
  submittingText,
}: TicketFormProps) {
  return (
    <form className="ticket-type-form" onSubmit={onSubmit}>
      <TicketSetupFields formState={formState} onFormChange={onFormChange} />
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

type TicketTypeCardProps = {
  isDeleting: boolean
  onDelete: (ticketType: EventTicketType) => void
  onEdit: (ticketType: EventTicketType) => void
  ticketType: EventTicketType
}

function TicketTypeCard({
  isDeleting,
  onDelete,
  onEdit,
  ticketType,
}: TicketTypeCardProps) {
  return (
    <article className="ticket-type-card">
      <TicketTypeSummary ticketType={ticketType} />

      <div className="owned-event-actions">
        <button
          type="button"
          className="secondary-action-button"
          onClick={() => onEdit(ticketType)}
        >
          Edit Ticket Type
        </button>

        <button
          type="button"
          className="secondary-action-button"
          disabled={isDeleting}
          onClick={() => onDelete(ticketType)}
        >
          {isDeleting ? 'Deleting...' : 'Delete Ticket Type'}
        </button>
      </div>
    </article>
  )
}

function TicketTypeSummary({ ticketType }: { ticketType: EventTicketType }) {
  return (
    <div className="ticket-type-copy">
      <div className="ticket-type-heading">
        <h4>{ticketType.name}</h4>
        <span className={`ticket-kind-badge is-${ticketType.ticketKind}`}>
          {formatTicketKind(ticketType.ticketKind)}
        </span>
      </div>

      {ticketType.description ? <p>{ticketType.description}</p> : null}

      {ticketType.ticketKind === 'paid' ? (
        <p>{formatTicketPrice(ticketType.priceCents)}</p>
      ) : null}

      <p>{`${ticketType.quantityTotal} available`}</p>
    </div>
  )
}

function getFormStateFromTicketType(
  ticketType: EventTicketType,
): TicketFormState {
  return {
    description: ticketType.description,
    name: ticketType.name,
    priceDollars:
      ticketType.ticketKind === 'paid'
        ? (ticketType.priceCents / 100).toFixed(2)
        : '',
    quantityTotal: String(ticketType.quantityTotal),
    ticketKind: ticketType.ticketKind,
  }
}

export default EventTicketManager
