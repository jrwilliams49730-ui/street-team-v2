import { useEffect, useMemo, useState, type TouchEvent } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Link } from 'react-router-dom'
import {
  formatEventDate,
  formatEventLocation,
  formatEventTime,
} from '../events/events'
import {
  fetchIndividualTicketsForReservation,
  formatIndividualTicketStatus,
  formatReservationStatus,
  formatTicketQrValue,
  formatTicketKind,
  formatTicketPrice,
  type IndividualTicket,
} from '../events/eventTickets'
import { fetchMyTickets, type MyTicket } from '../tickets/myTickets'

type MyTicketsSectionProps = {
  ownerUserId: string
}

type IndividualTicketLoadStatus = 'idle' | 'loading' | 'ready' | 'error'

function MyTicketsSection({ ownerUserId }: MyTicketsSectionProps) {
  const [tickets, setTickets] = useState<MyTicket[]>([])
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [individualTickets, setIndividualTickets] = useState<
    IndividualTicket[]
  >([])
  const [individualTicketStatus, setIndividualTicketStatus] =
    useState<IndividualTicketLoadStatus>('idle')
  const [selectedIndividualTicketIndex, setSelectedIndividualTicketIndex] =
    useState(0)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )

  useEffect(() => {
    let isMounted = true

    async function loadTickets() {
      setStatus('loading')

      try {
        const nextTickets = await fetchMyTickets(ownerUserId)

        if (isMounted) {
          setTickets(nextTickets)
          setSelectedTicketId((currentTicketId) =>
            nextTickets.some(
              (ticket) => ticket.reservation.id === currentTicketId,
            )
              ? currentTicketId
              : null,
          )
          setStatus('ready')
        }
      } catch {
        if (isMounted) {
          setStatus('error')
        }
      }
    }

    void loadTickets()

    return () => {
      isMounted = false
    }
  }, [ownerUserId])

  useEffect(() => {
    if (!selectedTicketId) {
      return
    }

    const reservationId = selectedTicketId
    let isMounted = true

    async function loadIndividualTickets() {
      setIndividualTicketStatus('loading')
      setIndividualTickets([])
      setSelectedIndividualTicketIndex(0)

      try {
        const nextIndividualTickets =
          await fetchIndividualTicketsForReservation(reservationId)

        if (isMounted) {
          setIndividualTickets(nextIndividualTickets)
          setIndividualTicketStatus('ready')
        }
      } catch {
        if (isMounted) {
          setIndividualTickets([])
          setIndividualTicketStatus('error')
        }
      }
    }

    void loadIndividualTickets()

    return () => {
      isMounted = false
    }
  }, [selectedTicketId])

  const { pastTickets, upcomingTickets } = useMemo(() => {
    const today = getTodayDateString()

    return {
      pastTickets: tickets.filter(
        (ticket) => !ticket.event || ticket.event.eventDate < today,
      ),
      upcomingTickets: tickets.filter(
        (ticket) => ticket.event && ticket.event.eventDate >= today,
      ),
    }
  }, [tickets])

  const selectedTicket =
    tickets.find((ticket) => ticket.reservation.id === selectedTicketId) ?? null
  const openTicketDetail = (reservationId: string) => {
    setIndividualTickets([])
    setIndividualTicketStatus('loading')
    setSelectedIndividualTicketIndex(0)
    setSelectedTicketId(reservationId)
  }
  const closeTicketDetail = () => {
    setSelectedTicketId(null)
    setIndividualTickets([])
    setIndividualTicketStatus('idle')
    setSelectedIndividualTicketIndex(0)
  }
  const goToPreviousIndividualTicket = () => {
    setSelectedIndividualTicketIndex((currentIndex) =>
      Math.max(0, currentIndex - 1),
    )
  }
  const goToNextIndividualTicket = () => {
    setSelectedIndividualTicketIndex((currentIndex) =>
      Math.min(Math.max(0, individualTickets.length - 1), currentIndex + 1),
    )
  }

  return (
    <section className="account-card my-tickets-section">
      <header className="section-heading">
        <h2>My Tickets</h2>
        <p>Free tickets and future reservations saved to your account.</p>
      </header>

      {status === 'loading' ? (
        <p className="my-tickets-state">Loading your tickets...</p>
      ) : null}

      {status === 'error' ? (
        <p className="my-tickets-state">Your tickets could not be loaded.</p>
      ) : null}

      {status === 'ready' && tickets.length === 0 ? (
        <p className="my-tickets-state">You do not have any tickets yet.</p>
      ) : null}

      {status === 'ready' && tickets.length > 0 ? (
        selectedTicket ? (
          <TicketDetailView
            individualTicketLoadStatus={individualTicketStatus}
            individualTickets={individualTickets}
            onBack={closeTicketDetail}
            onNextTicket={goToNextIndividualTicket}
            onPreviousTicket={goToPreviousIndividualTicket}
            selectedTicketIndex={selectedIndividualTicketIndex}
            ticket={selectedTicket}
          />
        ) : (
          <div className="my-ticket-sections">
            {upcomingTickets.length > 0 ? (
              <TicketGroup
                onViewTicket={openTicketDetail}
                tickets={upcomingTickets}
                title="Upcoming Tickets"
              />
            ) : null}

            {pastTickets.length > 0 ? (
              <TicketGroup
                onViewTicket={openTicketDetail}
                tickets={pastTickets}
                title="Past Tickets"
              />
            ) : null}
          </div>
        )
      ) : null}
    </section>
  )
}

function TicketGroup({
  onViewTicket,
  tickets,
  title,
}: {
  onViewTicket: (reservationId: string) => void
  tickets: MyTicket[]
  title: string
}) {
  return (
    <section className="my-ticket-group">
      <h3>{title}</h3>
      <div className="my-ticket-grid">
        {tickets.map((ticket) => (
          <MyTicketCard
            key={ticket.reservation.id}
            onViewTicket={onViewTicket}
            ticket={ticket}
          />
        ))}
      </div>
    </section>
  )
}

function MyTicketCard({
  onViewTicket,
  ticket,
}: {
  onViewTicket: (reservationId: string) => void
  ticket: MyTicket
}) {
  const { event, reservation, ticketType } = ticket
  const location = event ? formatEventLocation(event) : ''
  const ticketQuantityText =
    reservation.quantity === 1 ? '1 ticket' : `${reservation.quantity} tickets`

  return (
    <article className="my-ticket-card">
      <div className="my-ticket-thumbnail-frame">
        {event?.eventImageUrl ? (
          <img
            src={event.eventImageUrl}
            alt=""
            className="my-ticket-thumbnail-image"
            loading="lazy"
          />
        ) : (
          <span>ST</span>
        )}
      </div>

      <div className="my-ticket-copy">
        <div className="my-ticket-event">
          <h3>{event?.title ?? 'Event details unavailable'}</h3>
          {event ? (
            <>
              <p>
                {formatEventDate(event.eventDate)}
                {event.startTime ? ` at ${formatEventTime(event.startTime)}` : ''}
              </p>
              <p>{event.venueName}</p>
              {location ? <p>{location}</p> : null}
            </>
          ) : (
            <p>This reservation is saved, but event details are unavailable.</p>
          )}
        </div>

        <div className="my-ticket-wallet-meta">
          <span
            className={`ticket-reservation-status-badge is-${reservation.reservationStatus}`}
          >
            {formatReservationStatus(reservation.reservationStatus)}
          </span>
          <span>{ticketQuantityText}</span>
          {ticketType ? <span>{ticketType.name}</span> : null}
        </div>
      </div>

      <div className="my-ticket-card-action">
        <button
          type="button"
          className="auth-submit-button"
          onClick={() => onViewTicket(reservation.id)}
        >
          View Tickets
        </button>
      </div>
    </article>
  )
}

function TicketDetailView({
  individualTicketLoadStatus,
  individualTickets,
  onBack,
  onNextTicket,
  onPreviousTicket,
  selectedTicketIndex,
  ticket,
}: {
  individualTicketLoadStatus: IndividualTicketLoadStatus
  individualTickets: IndividualTicket[]
  onBack: () => void
  onNextTicket: () => void
  onPreviousTicket: () => void
  selectedTicketIndex: number
  ticket: MyTicket
}) {
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const { event, reservation, ticketType } = ticket
  const location = event ? formatEventLocation(event) : ''
  const ticketKind = reservation.ticketKindSnapshot
  const ticketName = ticketType?.name ?? 'Ticket type unavailable'
  const eventDate = event ? formatEventDate(event.eventDate) : 'Date unavailable'
  const eventTime = event?.startTime
    ? formatEventTime(event.startTime)
    : 'Time TBA'
  const venueLocation = event
    ? [event.venueName, location].filter(Boolean).join(' | ')
    : 'Location unavailable'
  const priceCents =
    reservation.unitPriceCentsSnapshot || ticketType?.priceCents || 0
  const currentIndividualTicket =
    individualTickets[selectedTicketIndex] ?? null
  const currentTicketPosition = currentIndividualTicket?.ticketNumber ?? 1
  const ticketCount =
    individualTickets.length > 0
      ? individualTickets.length
      : reservation.quantity
  const ticketCountLabel =
    individualTicketLoadStatus === 'loading'
      ? 'Loading ticket records...'
      : individualTicketLoadStatus === 'error'
        ? 'Ticket records unavailable'
        : `Ticket ${currentTicketPosition} of ${ticketCount}`
  const currentTicketStatusLabel = currentIndividualTicket
    ? formatIndividualTicketStatus(currentIndividualTicket.ticketStatus)
    : null
  const currentTicketQrValue = currentIndividualTicket
    ? formatTicketQrValue(currentIndividualTicket.qrToken)
    : null
  const showTicketControls = individualTickets.length > 1
  const canMoveToPreviousTicket = selectedTicketIndex > 0
  const canMoveToNextTicket =
    individualTickets.length > 0 &&
    selectedTicketIndex < individualTickets.length - 1

  function handleTicketTouchStart(event: TouchEvent<HTMLElement>) {
    if (!showTicketControls) {
      return
    }

    const touch = event.touches.item(0)

    if (touch) {
      setTouchStartX(touch.clientX)
    }
  }

  function handleTicketTouchEnd(event: TouchEvent<HTMLElement>) {
    if (!showTicketControls || touchStartX === null) {
      setTouchStartX(null)
      return
    }

    const touch = event.changedTouches.item(0)

    if (!touch) {
      setTouchStartX(null)
      return
    }

    const swipeDistance = touch.clientX - touchStartX

    if (Math.abs(swipeDistance) >= 50) {
      if (swipeDistance < 0 && canMoveToNextTicket) {
        onNextTicket()
      }

      if (swipeDistance > 0 && canMoveToPreviousTicket) {
        onPreviousTicket()
      }
    }

    setTouchStartX(null)
  }

  return (
    <div className="my-ticket-detail-view">
      <button
        type="button"
        className="secondary-action-button"
        onClick={onBack}
      >
        Back to My Tickets
      </button>

      <article
        className="my-ticket-detail"
        aria-label="Ticket details"
        onTouchStart={handleTicketTouchStart}
        onTouchEnd={handleTicketTouchEnd}
        onTouchCancel={() => setTouchStartX(null)}
      >
        <header className="my-ticket-detail-header">
          <div className="my-ticket-detail-timebar">
            <span>{eventDate}</span>
            <span>{eventTime}</span>
          </div>

          <div className="my-ticket-detail-summary">
            <div className="my-ticket-detail-thumbnail">
              {event?.eventImageUrl ? (
                <img src={event.eventImageUrl} alt="" />
              ) : (
                <span>ST</span>
              )}
            </div>

            <div className="my-ticket-detail-title">
              <h3>{event?.title ?? 'Event details unavailable'}</h3>
              <p>{ticketName}</p>

              <div className="my-ticket-badges">
                <span className={`ticket-kind-badge is-${ticketKind}`}>
                  {formatTicketKind(ticketKind)}
                </span>
                <span
                  className={`ticket-reservation-status-badge is-${reservation.reservationStatus}`}
                >
                  {formatReservationStatus(reservation.reservationStatus)}
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="my-ticket-instance-bar">
          <span>{ticketCountLabel}</span>
          {currentIndividualTicket ? (
            <span
              className={`individual-ticket-status-badge is-${currentIndividualTicket.ticketStatus}`}
            >
              {currentTicketStatusLabel}
            </span>
          ) : null}
        </div>

        <div
          className={`my-ticket-qr-zone${
            currentIndividualTicket?.ticketStatus === 'void' ? ' is-void' : ''
          }`}
        >
          {currentTicketQrValue ? (
            <QRCodeSVG
              value={currentTicketQrValue}
              title="Street Team ticket QR code"
              size={288}
              level="H"
              marginSize={6}
              bgColor="#ffffff"
              fgColor="#000000"
              className="my-ticket-qr-code"
            />
          ) : (
            <p>Loading ticket QR...</p>
          )}
        </div>

        {showTicketControls ? (
          <div className="my-ticket-navigation" aria-label="Ticket navigation">
            <button
              type="button"
              className="secondary-action-button"
              disabled={!canMoveToPreviousTicket}
              onClick={onPreviousTicket}
            >
              Previous Ticket
            </button>
            <button
              type="button"
              className="secondary-action-button"
              disabled={!canMoveToNextTicket}
              onClick={onNextTicket}
            >
              Next Ticket
            </button>
          </div>
        ) : null}

        <div className="my-ticket-divider" aria-hidden="true" />

        <div className="my-ticket-detail-body">
          {individualTicketLoadStatus === 'error' ? (
            <p className="my-ticket-record-note is-error">
              Individual ticket records could not be loaded right now.
            </p>
          ) : null}

          {individualTicketLoadStatus === 'ready' &&
          individualTickets.length === 0 ? (
            <p className="my-ticket-record-note">
              Individual ticket records are not available for this reservation yet.
            </p>
          ) : null}

          {reservation.quantity > 1 ? (
            <p className="my-ticket-quantity-note">
              This reservation includes {reservation.quantity} tickets.
            </p>
          ) : null}

          <dl className="my-ticket-details my-ticket-detail-info">
            <div>
              <dt>Date</dt>
              <dd>{eventDate}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>{eventTime}</dd>
            </div>
            <div className="is-wide">
              <dt>Venue / Location</dt>
              <dd>{venueLocation}</dd>
            </div>
            <div>
              <dt>Ticket holder</dt>
              <dd>{reservation.buyerName}</dd>
            </div>
            <div>
              <dt>Buyer email</dt>
              <dd>{reservation.buyerEmail}</dd>
            </div>
            <div>
              <dt>Ticket kind</dt>
              <dd>{formatTicketKind(ticketKind)}</dd>
            </div>
            {currentIndividualTicket ? (
              <div>
                <dt>Ticket status</dt>
                <dd>{currentTicketStatusLabel}</dd>
              </div>
            ) : null}
            <div>
              <dt>Reservation status</dt>
              <dd>{formatReservationStatus(reservation.reservationStatus)}</dd>
            </div>
            {ticketKind === 'paid' ? (
              <div>
                <dt>Price</dt>
                <dd>{formatTicketPrice(priceCents)}</dd>
              </div>
            ) : null}
          </dl>

          {event?.slug ? (
            <div className="my-ticket-detail-actions">
              <Link
                to={`/app/events/${event.slug}`}
                className="secondary-action-button"
              >
                Open event page
              </Link>
            </div>
          ) : null}
        </div>
      </article>
    </div>
  )
}

function getTodayDateString() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export default MyTicketsSection
