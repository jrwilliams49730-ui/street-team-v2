import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  checkInTicketByQr,
  createCheckoutSessionForReservation,
  createDoorTicketReservation,
  fetchDoorTicketSalesForEvent,
  fetchEventTicketTypes,
  formatTicketPrice,
  formatTicketQrValue,
  type DoorTicketSale,
  type EventTicketType,
  type TicketReservationStatus,
} from '../events/eventTickets'
import {
  fetchCheckoutTicketStatus,
  type CheckoutTicketStatus,
} from '../checkout/checkoutTicketStatus'

type EventDoorSalesManagerProps = {
  doorSaleReturn?: DoorSaleReturnState | null
  eventId: string
  onManageEvent?: () => void
  onOpenScanner?: () => void
  onReturnToBoxOffice?: () => void
}

type DoorSaleReturnState = {
  reservationId: string
  sessionId: string
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
type DoorSaleCheckInMessage = Message
type CheckoutStatusLoadState = 'idle' | 'loading' | 'ready' | 'error'
type DoorSaleTicket = CheckoutTicketStatus['tickets'][number]

const emptyDoorSaleForm: DoorSaleFormState = {
  buyerEmail: '',
  buyerName: '',
  quantity: '1',
  ticketTypeId: '',
}

function EventDoorSalesManager({
  doorSaleReturn = null,
  eventId,
  onManageEvent,
  onOpenScanner,
  onReturnToBoxOffice,
}: EventDoorSalesManagerProps) {
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

  function handleBackToBoxOffice() {
    void refreshDoorSales()
    onReturnToBoxOffice?.()
  }

  function handleSellAnotherTicket() {
    setFormState((currentFormState) => ({
      ...emptyDoorSaleForm,
      ticketTypeId: currentFormState.ticketTypeId,
    }))
    setMessage(null)
    void refreshDoorSales()
    onReturnToBoxOffice?.()
  }

  function handleScanTickets() {
    void refreshDoorSales()
    onOpenScanner?.()
  }

  function handleManageEvent() {
    void refreshDoorSales()
    onManageEvent?.()
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
          {doorSaleReturn ? (
            <DoorSaleReturnPanel
              eventId={eventId}
              onBackToBoxOffice={handleBackToBoxOffice}
              onManageEvent={handleManageEvent}
              onSaleUpdated={refreshDoorSales}
              onScanTickets={handleScanTickets}
              onSellAnotherTicket={handleSellAnotherTicket}
              returnState={doorSaleReturn}
            />
          ) : null}

          {!doorSaleReturn && paidTicketTypes.length === 0 ? (
            <p>Add a paid ticket type before selling at the door.</p>
          ) : null}

          {!doorSaleReturn && paidTicketTypes.length > 0 ? (
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
                <span>Buyer email optional</span>
                <input
                  type="email"
                  value={formState.buyerEmail}
                  onChange={(event) =>
                    updateField('buyerEmail', event.target.value)
                  }
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
          ) : null}

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

function DoorSaleReturnPanel({
  eventId,
  onBackToBoxOffice,
  onManageEvent,
  onSaleUpdated,
  onScanTickets,
  onSellAnotherTicket,
  returnState,
}: {
  eventId: string
  onBackToBoxOffice: () => void
  onManageEvent: () => void
  onSaleUpdated: () => Promise<void>
  onScanTickets: () => void
  onSellAnotherTicket: () => void
  returnState: DoorSaleReturnState
}) {
  const [checkoutStatus, setCheckoutStatus] =
    useState<CheckoutTicketStatus | null>(null)
  const [loadState, setLoadState] =
    useState<CheckoutStatusLoadState>('idle')
  const [checkInMessage, setCheckInMessage] =
    useState<DoorSaleCheckInMessage | null>(null)
  const [checkingTicketId, setCheckingTicketId] = useState<string | null>(null)
  const [isCheckingAllTickets, setIsCheckingAllTickets] = useState(false)

  useEffect(() => {
    let isMounted = true
    let retryTimeoutId: number | null = null

    async function loadCheckoutStatus(attempt = 0) {
      setLoadState('loading')

      try {
        const nextCheckoutStatus = await fetchCheckoutTicketStatus({
          reservationId: returnState.reservationId,
          sessionId: returnState.sessionId,
        })

        if (!isMounted) {
          return
        }

        setCheckoutStatus(nextCheckoutStatus)
        setLoadState('ready')

        const shouldRetry =
          attempt < 8 &&
          (nextCheckoutStatus.eventId !== eventId ||
            nextCheckoutStatus.reservationStatus !== 'confirmed' ||
            nextCheckoutStatus.tickets.length === 0)

        if (shouldRetry) {
          retryTimeoutId = window.setTimeout(() => {
            void loadCheckoutStatus(attempt + 1)
          }, 1500)
        }
      } catch {
        if (isMounted) {
          setCheckoutStatus(null)
          setLoadState('error')
        }
      }
    }

    void loadCheckoutStatus()

    return () => {
      isMounted = false

      if (retryTimeoutId !== null) {
        window.clearTimeout(retryTimeoutId)
      }
    }
  }, [eventId, returnState.reservationId, returnState.sessionId])

  function updateDoorSaleTicketStatus(
    ticketId: string,
    ticketStatus: string,
    checkedInAt: string | null,
  ) {
    setCheckoutStatus((currentStatus) =>
      currentStatus
        ? {
            ...currentStatus,
            tickets: currentStatus.tickets.map((ticket) =>
              ticket.id === ticketId
                ? {
                    ...ticket,
                    checkedInAt,
                    ticketStatus,
                  }
                : ticket,
            ),
          }
        : currentStatus,
    )
  }

  async function handleTicketCheckIn(ticket: DoorSaleTicket) {
    setCheckingTicketId(ticket.id)
    setCheckInMessage(null)

    try {
      const result = await checkInTicketByQr(formatTicketQrValue(ticket.qrToken))

      if (result.ticketId) {
        updateDoorSaleTicketStatus(
          result.ticketId,
          result.ticketStatus ?? ticket.ticketStatus,
          result.checkedInAt,
        )
      }

      const isSuccess =
        result.outcome === 'checked_in' ||
        result.outcome === 'already_checked_in'

      setCheckInMessage({
        type: isSuccess ? 'success' : 'error',
        text:
          result.outcome === 'checked_in'
            ? 'Checked in successfully. 1 ticket checked in.'
            : result.message,
      })

      if (isSuccess) {
        await onSaleUpdated()
      }
    } catch (error) {
      setCheckInMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Ticket could not be checked in.',
      })
    } finally {
      setCheckingTicketId(null)
    }
  }

  async function handleCheckInAll() {
    if (!checkoutStatus) {
      return
    }

    const ticketsToCheckIn = checkoutStatus.tickets.filter(
      (ticket) => ticket.ticketStatus !== 'checked_in',
    )

    if (ticketsToCheckIn.length === 0) {
      setCheckInMessage({
        type: 'success',
        text: 'All tickets are already checked in.',
      })
      return
    }

    setIsCheckingAllTickets(true)
    setCheckInMessage(null)

    let checkedInCount = 0
    let alreadyCheckedInCount = 0
    const failures: string[] = []

    try {
      for (const ticket of ticketsToCheckIn) {
        try {
          const result = await checkInTicketByQr(
            formatTicketQrValue(ticket.qrToken),
          )

          if (result.ticketId) {
            updateDoorSaleTicketStatus(
              result.ticketId,
              result.ticketStatus ?? ticket.ticketStatus,
              result.checkedInAt,
            )
          }

          if (result.outcome === 'checked_in') {
            checkedInCount += 1
          } else if (result.outcome === 'already_checked_in') {
            alreadyCheckedInCount += 1
          } else {
            failures.push(`Ticket ${ticket.ticketNumber}: ${result.message}`)
          }
        } catch (error) {
          failures.push(
            `Ticket ${ticket.ticketNumber}: ${
              error instanceof Error ? error.message : 'Check-in failed.'
            }`,
          )
        }
      }

      if (failures.length > 0) {
        setCheckInMessage({
          type: 'error',
          text: `Checked in ${checkedInCount} ticket(s). ${failures.join(' ')}`,
        })
      } else {
        setCheckInMessage({
          type: 'success',
          text:
            checkedInCount > 0
              ? `Checked in successfully. ${checkedInCount} ticket(s) checked in.`
              : `${alreadyCheckedInCount} ticket(s) were already checked in.`,
        })
        await onSaleUpdated()
      }
    } finally {
      setIsCheckingAllTickets(false)
    }
  }

  if (loadState === 'loading' || loadState === 'idle') {
    return (
      <section className="door-sale-success-panel">
        <h3>Loading box office sale...</h3>
        <p>Payment succeeded. We are checking the paid ticket records.</p>
      </section>
    )
  }

  if (loadState === 'error' || !checkoutStatus) {
    return (
      <section className="door-sale-success-panel">
        <h3>Box office payment successful</h3>
        <p>
          Sale details could not be loaded right now. Back to Box Office will
          refresh the buyer list for this event.
        </p>
        <DoorSaleReturnActions
          onBackToBoxOffice={onBackToBoxOffice}
          onManageEvent={onManageEvent}
          onScanTickets={onScanTickets}
          onSellAnotherTicket={onSellAnotherTicket}
        />
      </section>
    )
  }

  if (checkoutStatus.eventId !== eventId) {
    return (
      <section className="door-sale-success-panel">
        <h3>Box office sale loaded for a different event</h3>
        <p>Return to Box Office and refresh the event before checking in.</p>
        <DoorSaleReturnActions
          onBackToBoxOffice={onBackToBoxOffice}
          onManageEvent={onManageEvent}
          onScanTickets={onScanTickets}
          onSellAnotherTicket={onSellAnotherTicket}
        />
      </section>
    )
  }

  const tickets = checkoutStatus.tickets
  const uncheckedTickets = tickets.filter(
    (ticket) => ticket.ticketStatus !== 'checked_in',
  )
  const checkedInTickets = tickets.length - uncheckedTickets.length
  const checkInAllLabel =
    checkoutStatus.quantity === 1 ? 'Check In Now' : 'Check In All Now'
  const isPending =
    checkoutStatus.reservationStatus !== 'confirmed' || tickets.length === 0

  return (
    <section className="door-sale-success-panel">
      <header className="door-sale-success-heading">
        <h3>Box office payment successful</h3>
        <p>
          {isPending
            ? 'Ticket records are still being finalized.'
            : `${checkedInTickets} of ${tickets.length} ticket(s) checked in.`}
        </p>
      </header>

      <dl className="door-sale-success-details">
        <div>
          <dt>Event</dt>
          <dd>{checkoutStatus.eventTitle ?? 'Event unavailable'}</dd>
        </div>
        <div>
          <dt>Ticket type</dt>
          <dd>{checkoutStatus.ticketTypeName ?? 'Ticket type unavailable'}</dd>
        </div>
        <div>
          <dt>Quantity</dt>
          <dd>{checkoutStatus.quantity}</dd>
        </div>
        <div>
          <dt>Buyer</dt>
          <dd>{checkoutStatus.buyerName || 'Door sale buyer'}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{checkoutStatus.buyerEmail || 'No email provided'}</dd>
        </div>
        <div>
          <dt>Payment status</dt>
          <dd>{formatDoorSaleStatusForCheckout(checkoutStatus.reservationStatus)}</dd>
        </div>
        <div>
          <dt>Total</dt>
          <dd>{formatTicketPrice(checkoutStatus.totalPriceCents)}</dd>
        </div>
      </dl>

      {checkInMessage ? (
        <p className={`auth-message ${checkInMessage.type}`}>
          {checkInMessage.text}
        </p>
      ) : null}

      {isPending ? (
        <p className="checkout-return-small">
          Waiting for Stripe confirmation and ticket creation. This panel will
          keep checking for a moment.
        </p>
      ) : (
        <div className="door-sale-check-in-actions">
          <button
            type="button"
            className="auth-submit-button"
            disabled={isCheckingAllTickets || uncheckedTickets.length === 0}
            onClick={handleCheckInAll}
          >
            {isCheckingAllTickets ? 'Checking in...' : checkInAllLabel}
          </button>
        </div>
      )}

      {tickets.length > 1 ? (
        <div className="door-sale-ticket-list">
          {tickets.map((ticket) => (
            <DoorSaleTicketCheckInCard
              checkingTicketId={checkingTicketId}
              isCheckingAllTickets={isCheckingAllTickets}
              key={ticket.id}
              onCheckInTicket={handleTicketCheckIn}
              quantity={checkoutStatus.quantity}
              ticket={ticket}
            />
          ))}
        </div>
      ) : null}

      <DoorSaleReturnActions
        onBackToBoxOffice={onBackToBoxOffice}
        onManageEvent={onManageEvent}
        onScanTickets={onScanTickets}
        onSellAnotherTicket={onSellAnotherTicket}
      />
    </section>
  )
}

function DoorSaleTicketCheckInCard({
  checkingTicketId,
  isCheckingAllTickets,
  onCheckInTicket,
  quantity,
  ticket,
}: {
  checkingTicketId: string | null
  isCheckingAllTickets: boolean
  onCheckInTicket: (ticket: DoorSaleTicket) => void
  quantity: number
  ticket: DoorSaleTicket
}) {
  const isCheckedIn = ticket.ticketStatus === 'checked_in'
  const isChecking = checkingTicketId === ticket.id

  return (
    <article className="door-sale-ticket-card">
      <div>
        <strong>
          Ticket {ticket.ticketNumber} of {quantity}
        </strong>
        <span>{formatCheckoutTicketStatus(ticket.ticketStatus)}</span>
        {ticket.checkedInAt ? (
          <span>Checked in {formatDoorSaleTime(ticket.checkedInAt)}</span>
        ) : null}
      </div>

      <button
        type="button"
        className="secondary-action-button"
        disabled={isCheckedIn || isChecking || isCheckingAllTickets}
        onClick={() => onCheckInTicket(ticket)}
      >
        {isChecking
          ? 'Checking in...'
          : isCheckedIn
            ? 'Checked In'
            : `Ticket ${ticket.ticketNumber} - Check In`}
      </button>
    </article>
  )
}

function DoorSaleReturnActions({
  onBackToBoxOffice,
  onManageEvent,
  onScanTickets,
  onSellAnotherTicket,
}: {
  onBackToBoxOffice: () => void
  onManageEvent: () => void
  onScanTickets: () => void
  onSellAnotherTicket: () => void
}) {
  return (
    <div className="door-sale-post-actions">
      <button
        type="button"
        className="auth-submit-button"
        onClick={onBackToBoxOffice}
      >
        Back to Box Office
      </button>
      <button
        type="button"
        className="secondary-action-button"
        onClick={onSellAnotherTicket}
      >
        Sell Another Ticket
      </button>
      <button
        type="button"
        className="secondary-action-button"
        onClick={onScanTickets}
      >
        Scan Tickets
      </button>
      <button
        type="button"
        className="secondary-action-button"
        onClick={onManageEvent}
      >
        Manage Event
      </button>
    </div>
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
      <p>{reservation.buyerEmail || 'No email provided'}</p>
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

function formatDoorSaleStatusForCheckout(status: string) {
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

function formatCheckoutTicketStatus(status: string) {
  if (status === 'checked_in') {
    return 'Checked in'
  }

  if (status === 'void') {
    return 'Void'
  }

  return 'Not checked in'
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
