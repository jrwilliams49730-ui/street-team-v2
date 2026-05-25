import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../account/auth-context'
import { fetchUserProfile } from '../account/userProfile'
import {
  fetchCheckoutTicketStatus,
  type CheckoutTicketStatus,
} from './checkoutTicketStatus'
import {
  cancelDoorTicketReservation,
  checkInTicketByQr,
  formatTicketPrice,
  formatTicketQrValue,
} from '../events/eventTickets'

type FanTicketLinkStatus = 'hidden' | 'loading' | 'visible'
type CheckoutStatusLoadState = 'idle' | 'loading' | 'ready' | 'error'
type DoorSaleCheckInMessage = {
  type: 'success' | 'error'
  text: string
}

export function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams()
  const { isLoading, session } = useAuth()
  const sessionId = searchParams.get('session_id')?.trim() ?? ''
  const reservationId = searchParams.get('reservation_id')?.trim() ?? ''
  const guestCheckoutParam = searchParams.get('guest_checkout')
  const ticketEmailParam = searchParams.get('ticket_email')
  const isDoorSale = searchParams.get('door_sale') === '1'
  const [fanTicketLinkStatus, setFanTicketLinkStatus] =
    useState<FanTicketLinkStatus>('hidden')
  const [checkoutStatus, setCheckoutStatus] =
    useState<CheckoutTicketStatus | null>(null)
  const [checkoutStatusLoadState, setCheckoutStatusLoadState] =
    useState<CheckoutStatusLoadState>('idle')
  const [doorSaleCheckInMessage, setDoorSaleCheckInMessage] =
    useState<DoorSaleCheckInMessage | null>(null)
  const [checkingTicketId, setCheckingTicketId] = useState<string | null>(null)
  const [isCheckingAllTickets, setIsCheckingAllTickets] = useState(false)
  const isGuestCheckout =
    checkoutStatus?.isGuestCheckout ??
    (guestCheckoutParam === '1' ||
      (!guestCheckoutParam && !isLoading && !session))
  const isGuestTicketEmailConfigured =
    isGuestCheckout &&
    (checkoutStatus?.ticketEmailConfigured ?? ticketEmailParam === 'configured')
  const ticketEmailError = checkoutStatus?.ticketEmailError?.trim() ?? ''
  const hasTicketEmailRecipient = Boolean(checkoutStatus?.buyerEmail?.trim())
  const showGuestEmailSuccess =
    isGuestCheckout &&
    isGuestTicketEmailConfigured &&
    !ticketEmailError &&
    (!isDoorSale || hasTicketEmailRecipient)

  useEffect(() => {
    let isMounted = true

    async function loadAccountType() {
      if (isLoading) {
        return
      }

      if (!session) {
        setFanTicketLinkStatus('hidden')
        return
      }

      setFanTicketLinkStatus('loading')

      try {
        const profile = await fetchUserProfile(session.user.id)

        if (isMounted) {
          setFanTicketLinkStatus(
            profile.accountType === 'fan' ? 'visible' : 'hidden',
          )
        }
      } catch {
        if (isMounted) {
          setFanTicketLinkStatus('hidden')
        }
      }
    }

    void loadAccountType()

    return () => {
      isMounted = false
    }
  }, [isLoading, session])

  useEffect(() => {
    if (!sessionId && !reservationId) {
      return
    }

    let isMounted = true
    let retryTimeoutId: number | null = null

    async function loadCheckoutStatus(attempt = 0) {
      setCheckoutStatusLoadState('loading')

      try {
        const nextCheckoutStatus = await fetchCheckoutTicketStatus({
          reservationId,
          sessionId,
        })

        if (isMounted) {
          setCheckoutStatus(nextCheckoutStatus)
          setCheckoutStatusLoadState('ready')

          const shouldRetryDoorSale =
            isDoorSale &&
            attempt < 6 &&
            (nextCheckoutStatus.reservationStatus !== 'confirmed' ||
              nextCheckoutStatus.tickets.length === 0)

          if (shouldRetryDoorSale) {
            retryTimeoutId = window.setTimeout(() => {
              void loadCheckoutStatus(attempt + 1)
            }, 1500)
          }
        }
      } catch {
        if (isMounted) {
          setCheckoutStatus(null)
          setCheckoutStatusLoadState('error')
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
  }, [isDoorSale, reservationId, sessionId])

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

  async function handleDoorSaleTicketCheckIn(
    ticket: CheckoutTicketStatus['tickets'][number],
  ) {
    setCheckingTicketId(ticket.id)
    setDoorSaleCheckInMessage(null)

    try {
      const result = await checkInTicketByQr(formatTicketQrValue(ticket.qrToken))

      if (result.ticketId) {
        updateDoorSaleTicketStatus(
          result.ticketId,
          result.ticketStatus ?? ticket.ticketStatus,
          result.checkedInAt,
        )
      }

      setDoorSaleCheckInMessage({
        type: result.outcome === 'checked_in' ? 'success' : 'error',
        text: result.message,
      })
    } catch (error) {
      setDoorSaleCheckInMessage({
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

  async function handleDoorSaleCheckInAll() {
    if (!checkoutStatus) {
      return
    }

    const ticketsToCheckIn = checkoutStatus.tickets.filter(
      (ticket) => ticket.ticketStatus !== 'checked_in',
    )

    if (ticketsToCheckIn.length === 0) {
      setDoorSaleCheckInMessage({
        type: 'success',
        text: 'All tickets are already checked in.',
      })
      return
    }

    setIsCheckingAllTickets(true)
    setDoorSaleCheckInMessage(null)

    let checkedInCount = 0
    const failures: string[] = []

    for (const ticket of ticketsToCheckIn) {
      try {
        const result = await checkInTicketByQr(formatTicketQrValue(ticket.qrToken))

        if (result.ticketId) {
          updateDoorSaleTicketStatus(
            result.ticketId,
            result.ticketStatus ?? ticket.ticketStatus,
            result.checkedInAt,
          )
        }

        if (result.outcome === 'checked_in') {
          checkedInCount += 1
        } else if (result.outcome !== 'already_checked_in') {
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

    setDoorSaleCheckInMessage({
      type: failures.length > 0 ? 'error' : 'success',
      text:
        failures.length > 0
          ? `Checked in ${checkedInCount} ticket(s). ${failures.join(' ')}`
          : `Checked in ${checkedInCount} ticket(s).`,
    })
    setIsCheckingAllTickets(false)
  }

  return (
    <section className="checkout-return-page">
      <div className="checkout-return-card is-success">
        <span className="checkout-return-kicker">Stripe Checkout</span>
        <h2>
          {isDoorSale
            ? 'Box office payment successful.'
            : isGuestCheckout
              ? 'Payment successful.'
              : 'Payment received.'}
        </h2>

        {sessionId ? (
          isDoorSale && showGuestEmailSuccess ? (
            <p>Payment successful. The buyer&apos;s ticket has been emailed.</p>
          ) : isDoorSale && ticketEmailError ? (
            <p>
              Payment successful. We could not send the buyer&apos;s ticket
              email automatically, but the ticket is still confirmed.
            </p>
          ) : isDoorSale ? (
            <p>
              Payment successful. The box office sale is complete.
            </p>
          ) : showGuestEmailSuccess ? (
            <p>Payment successful. Your ticket has been emailed to you.</p>
          ) : ticketEmailError ? (
            <p>
              Payment successful. We could not send your ticket email
              automatically, but your ticket is still confirmed.
            </p>
          ) : isGuestCheckout ? (
            <p>
              Payment successful. Your ticket purchase is complete.
            </p>
          ) : (
            <p>
              We&rsquo;re finalizing your tickets now. Once payment confirmation
              finishes, signed-in fan purchases will be available in My Tickets.
            </p>
          )
        ) : (
          <p>
            Checkout completed, but we could not read the session reference
            from the return link.
          </p>
        )}

        {ticketEmailError ? (
          <p className="checkout-return-note">
            The event organizer can see the ticket email failure in the attendee
            list. Keep your reservation reference for support.
          </p>
        ) : showGuestEmailSuccess ? (
          <p className="checkout-return-note">
            Check your inbox for the ticket link. The link opens your QR code.
          </p>
        ) : null}

        {isGuestCheckout && checkoutStatusLoadState === 'loading' ? (
          <p className="checkout-return-small">Checking ticket email status...</p>
        ) : null}

        {isGuestCheckout && checkoutStatusLoadState === 'error' ? (
          <p className="checkout-return-small">
            Ticket email status could not be loaded right now.
          </p>
        ) : null}

        {checkoutStatus?.reservationId || reservationId ? (
          <p className="checkout-return-small">
            Reservation reference saved from the return link.
          </p>
        ) : null}

        {isDoorSale ? (
          <DoorSaleSuccessPanel
            checkoutStatus={checkoutStatus}
            checkingTicketId={checkingTicketId}
            checkInMessage={doorSaleCheckInMessage}
            isCheckingAllTickets={isCheckingAllTickets}
            loadState={checkoutStatusLoadState}
            onCheckInAll={handleDoorSaleCheckInAll}
            onCheckInTicket={handleDoorSaleTicketCheckIn}
          />
        ) : null}

        <div className="checkout-return-actions">
          <Link
            to={isDoorSale ? '/account?tab=my-events' : '/events'}
            className="auth-submit-button"
          >
            {isDoorSale ? 'Return to My Events' : 'Return to Events'}
          </Link>

          {fanTicketLinkStatus === 'visible' ? (
            <Link
              to="/account?tab=my-tickets"
              className="secondary-action-button"
            >
              Go to My Tickets
            </Link>
          ) : null}
        </div>

        {fanTicketLinkStatus === 'loading' ? (
          <p className="checkout-return-small">Checking your account type...</p>
        ) : null}
      </div>
    </section>
  )
}

type DoorSaleTicket = CheckoutTicketStatus['tickets'][number]

function DoorSaleSuccessPanel({
  checkoutStatus,
  checkingTicketId,
  checkInMessage,
  isCheckingAllTickets,
  loadState,
  onCheckInAll,
  onCheckInTicket,
}: {
  checkoutStatus: CheckoutTicketStatus | null
  checkingTicketId: string | null
  checkInMessage: DoorSaleCheckInMessage | null
  isCheckingAllTickets: boolean
  loadState: CheckoutStatusLoadState
  onCheckInAll: () => void
  onCheckInTicket: (ticket: DoorSaleTicket) => void
}) {
  if (loadState === 'loading' || loadState === 'idle') {
    return (
      <section className="door-sale-success-panel">
        <h3>Loading box office sale...</h3>
        <p>Checking the paid ticket records from Stripe.</p>
      </section>
    )
  }

  if (loadState === 'error' || !checkoutStatus) {
    return (
      <section className="door-sale-success-panel">
        <h3>Box office sale paid</h3>
        <p>
          Sale details could not be loaded right now. Return to Box Office to
          refresh the buyer list.
        </p>
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

  return (
    <section className="door-sale-success-panel">
      <header className="door-sale-success-heading">
        <h3>Box office sale ready</h3>
        <p>
          {checkedInTickets} of {tickets.length} ticket(s) checked in.
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
          <dd>{formatCheckoutReservationStatus(checkoutStatus.reservationStatus)}</dd>
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

      {tickets.length > 0 ? (
        <div className="door-sale-check-in-actions">
          <button
            type="button"
            className="auth-submit-button"
            disabled={isCheckingAllTickets || uncheckedTickets.length === 0}
            onClick={onCheckInAll}
          >
            {isCheckingAllTickets ? 'Checking in...' : checkInAllLabel}
          </button>
        </div>
      ) : (
        <p className="checkout-return-small">
          Ticket records are still being finalized. Refresh Box Office in a
          moment if they do not appear.
        </p>
      )}

      {tickets.length > 1 ? (
        <div className="door-sale-ticket-list">
          {tickets.map((ticket) => (
            <DoorSaleTicketCheckInCard
              key={ticket.id}
              checkingTicketId={checkingTicketId}
              isCheckingAllTickets={isCheckingAllTickets}
              onCheckInTicket={onCheckInTicket}
              quantity={checkoutStatus.quantity}
              ticket={ticket}
            />
          ))}
        </div>
      ) : null}
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
          <span>Checked in {formatCheckoutTime(ticket.checkedInAt)}</span>
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

function formatCheckoutReservationStatus(status: string) {
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

function formatCheckoutTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function CheckoutCancelledPage() {
  const [searchParams] = useSearchParams()
  const reservationId = searchParams.get('reservation_id')?.trim() ?? ''
  const isDoorSale = searchParams.get('door_sale') === '1'

  useEffect(() => {
    if (!isDoorSale || !reservationId) {
      return
    }

    async function markDoorSaleCancelled() {
      try {
        await cancelDoorTicketReservation(reservationId)
      } catch {
        // The pending hold will still expire automatically if cancellation fails.
      }
    }

    void markDoorSaleCancelled()
  }, [isDoorSale, reservationId])

  return (
    <section className="checkout-return-page">
      <div className="checkout-return-card is-cancelled">
        <span className="checkout-return-kicker">Stripe Checkout</span>
        <h2>{isDoorSale ? 'Box office checkout cancelled.' : 'Checkout cancelled.'}</h2>
        <p>
          No payment was completed. The pending ticket hold will expire
          automatically if checkout is not completed.
        </p>

        {reservationId ? (
          <p className="checkout-return-small">
            Reservation reference saved from the return link.
          </p>
        ) : null}

        <div className="checkout-return-actions">
          <Link
            to={isDoorSale ? '/account?tab=my-events' : '/events'}
            className="auth-submit-button"
          >
            {isDoorSale ? 'Return to My Events' : 'Return to Events'}
          </Link>
        </div>
      </div>
    </section>
  )
}
