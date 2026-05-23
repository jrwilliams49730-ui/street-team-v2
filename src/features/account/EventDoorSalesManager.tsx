import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  createCheckoutSessionForReservation,
  createDoorTicketReservation,
  fetchDoorTicketSalesForEvent,
  fetchEventTicketTypes,
  formatTicketPrice,
  type DoorTicketSale,
  type EventTicketType,
  type TicketReservationStatus,
} from '../events/eventTickets'

type EventDoorSalesManagerProps = {
  eventId: string
}

type DoorSaleFormState = {
  buyerEmail: string
  buyerName: string
  quantity: string
  ticketTypeId: string
}

type Message = {
  type: 'success' | 'error'
  text: string
}

const emptyDoorSaleForm: DoorSaleFormState = {
  buyerEmail: '',
  buyerName: '',
  quantity: '1',
  ticketTypeId: '',
}

function EventDoorSalesManager({ eventId }: EventDoorSalesManagerProps) {
  const [ticketTypes, setTicketTypes] = useState<EventTicketType[]>([])
  const [doorSales, setDoorSales] = useState<DoorTicketSale[]>([])
  const [formState, setFormState] =
    useState<DoorSaleFormState>(emptyDoorSaleForm)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [message, setMessage] = useState<Message | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const paidTicketTypes = useMemo(
    () =>
      ticketTypes.filter((ticketType) => ticketType.ticketKind === 'paid'),
    [ticketTypes],
  )

  useEffect(() => {
    let isMounted = true

    async function loadBoxOffice() {
      setStatus('loading')

      try {
        const [nextTicketTypes, nextDoorSales] = await Promise.all([
          fetchEventTicketTypes(eventId),
          fetchDoorTicketSalesForEvent(eventId),
        ])

        if (!isMounted) {
          return
        }

        const nextPaidTicketTypes = nextTicketTypes.filter(
          (ticketType) => ticketType.ticketKind === 'paid',
        )

        setTicketTypes(nextTicketTypes)
        setDoorSales(nextDoorSales)
        setFormState((currentFormState) => ({
          ...currentFormState,
          ticketTypeId:
            currentFormState.ticketTypeId || nextPaidTicketTypes[0]?.id || '',
        }))
        setStatus('ready')
      } catch {
        if (isMounted) {
          setStatus('error')
        }
      }
    }

    void loadBoxOffice()

    return () => {
      isMounted = false
    }
  }, [eventId])

  function updateField<FieldName extends keyof DoorSaleFormState>(
    fieldName: FieldName,
    value: DoorSaleFormState[FieldName],
  ) {
    setFormState((currentFormState) => ({
      ...currentFormState,
      [fieldName]: value,
    }))
  }

  async function refreshDoorSales() {
    const nextDoorSales = await fetchDoorTicketSalesForEvent(eventId)
    setDoorSales(nextDoorSales)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const quantity = Number.parseInt(formState.quantity, 10)

    if (!formState.ticketTypeId) {
      setMessage({
        type: 'error',
        text: 'Choose a paid ticket type before starting a box office sale.',
      })
      return
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setMessage({
        type: 'error',
        text: 'Enter a valid ticket quantity.',
      })
      return
    }

    setIsSubmitting(true)
    setMessage(null)

    try {
      const reservation = await createDoorTicketReservation({
        buyerEmail: formState.buyerEmail,
        buyerName: formState.buyerName,
        quantity,
        ticketTypeId: formState.ticketTypeId,
      })
      await refreshDoorSales()
      setMessage({
        type: 'success',
        text: 'Box office reservation created. Redirecting to Stripe Checkout...',
      })

      const checkoutSession = await createCheckoutSessionForReservation(
        reservation.id,
        { checkoutMode: 'door_sale' },
      )

      window.location.assign(checkoutSession.url)
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Box office sale could not be started.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="event-ticket-manager event-door-sales-manager">
      <header className="event-ticket-heading">
        <h4>Box Office</h4>
        <p>Sell paid tickets at the door with Stripe Checkout.</p>
      </header>

      {status === 'loading' ? <p>Loading box office...</p> : null}
      {status === 'error' ? <p>Box office could not be loaded.</p> : null}

      {status === 'ready' ? (
        <>
          {paidTicketTypes.length === 0 ? (
            <p>Add a paid ticket type before selling at the door.</p>
          ) : (
            <form className="ticket-type-form" onSubmit={handleSubmit}>
              <label>
                <span>Buyer name</span>
                <input
                  type="text"
                  value={formState.buyerName}
                  onChange={(event) =>
                    updateField('buyerName', event.target.value)
                  }
                  required
                />
              </label>

              <label>
                <span>Buyer email</span>
                <input
                  type="email"
                  value={formState.buyerEmail}
                  onChange={(event) =>
                    updateField('buyerEmail', event.target.value)
                  }
                  required
                />
              </label>

              <label>
                <span>Ticket type</span>
                <select
                  value={formState.ticketTypeId}
                  onChange={(event) =>
                    updateField('ticketTypeId', event.target.value)
                  }
                  required
                >
                  {paidTicketTypes.map((ticketType) => (
                    <option key={ticketType.id} value={ticketType.id}>
                      {ticketType.name} - {formatTicketPrice(ticketType.priceCents)}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Quantity</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={formState.quantity}
                  onChange={(event) =>
                    updateField('quantity', event.target.value)
                  }
                  required
                />
              </label>

              <button
                type="submit"
                className="auth-submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Starting Checkout...' : 'Sell Ticket at Door'}
              </button>
            </form>
          )}

          {message ? (
            <p className={`auth-message ${message.type}`}>{message.text}</p>
          ) : null}

          <section className="door-sale-history">
            <div className="event-ticket-heading">
              <h4>Recent Box Office Sales</h4>
              <p>Refresh after returning from Stripe to see the latest status.</p>
            </div>

            <button
              type="button"
              className="secondary-action-button"
              onClick={() => {
                void refreshDoorSales()
              }}
            >
              Refresh Sales
            </button>

            {doorSales.length === 0 ? <p>No box office sales yet.</p> : null}

            {doorSales.length > 0 ? (
              <div className="door-sale-list">
                {doorSales.map((doorSale) => (
                  <DoorSaleCard
                    doorSale={doorSale}
                    key={doorSale.reservation.id}
                  />
                ))}
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </section>
  )
}

function DoorSaleCard({ doorSale }: { doorSale: DoorTicketSale }) {
  const reservation = doorSale.reservation
  const emailStatus = getDoorSaleEmailStatus(doorSale)

  return (
    <article className="door-sale-card">
      <div className="attendee-ticket-heading">
        <h4>{reservation.buyerName}</h4>
        <span
          className={`ticket-reservation-status-badge is-${reservation.reservationStatus}`}
        >
          {formatDoorSaleStatus(reservation.reservationStatus)}
        </span>
      </div>
      <p>{reservation.buyerEmail}</p>
      <p>
        {doorSale.ticketTypeName} x {reservation.quantity}
      </p>
      <p>Total: {formatTicketPrice(reservation.totalPriceCentsSnapshot)}</p>
      <p>Created {formatDoorSaleTime(reservation.createdAt)}</p>
      {emailStatus ? (
        <div className={`ticket-email-status is-${emailStatus.tone}`}>
          <strong>{emailStatus.label}</strong>
          {emailStatus.detail ? <span>{emailStatus.detail}</span> : null}
        </div>
      ) : null}
    </article>
  )
}

function formatDoorSaleStatus(status: TicketReservationStatus) {
  if (status === 'confirmed') {
    return 'Paid'
  }

  if (status === 'pending') {
    return 'Pending Payment'
  }

  if (status === 'cancelled') {
    return 'Canceled'
  }

  return 'Expired'
}

function getDoorSaleEmailStatus(doorSale: DoorTicketSale) {
  const reservation = doorSale.reservation

  if (reservation.ticketEmailError) {
    return {
      detail: reservation.ticketEmailError,
      label: 'Ticket email failed',
      tone: 'error',
    } as const
  }

  if (reservation.ticketEmailSentAt) {
    return {
      detail: formatDoorSaleTime(reservation.ticketEmailSentAt),
      label: 'Ticket email sent',
      tone: 'success',
    } as const
  }

  if (reservation.ticketEmailLastAttemptedAt) {
    return {
      detail: formatDoorSaleTime(reservation.ticketEmailLastAttemptedAt),
      label: 'Ticket email attempted',
      tone: 'warning',
    } as const
  }

  return null
}

function formatDoorSaleTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default EventDoorSalesManager
