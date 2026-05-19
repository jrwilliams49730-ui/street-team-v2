import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  formatEventDate,
  formatEventLocation,
  formatEventTime,
} from '../events/events'
import {
  formatReservationStatus,
  formatTicketKind,
  formatTicketPrice,
} from '../events/eventTickets'
import { fetchMyTickets, type MyTicket } from '../tickets/myTickets'

type MyTicketsSectionProps = {
  ownerUserId: string
}

function MyTicketsSection({ ownerUserId }: MyTicketsSectionProps) {
  const [tickets, setTickets] = useState<MyTicket[]>([])
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
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
            onBack={() => setSelectedTicketId(null)}
            ticket={selectedTicket}
          />
        ) : (
          <div className="my-ticket-sections">
            {upcomingTickets.length > 0 ? (
              <TicketGroup
                onViewTicket={setSelectedTicketId}
                tickets={upcomingTickets}
                title="Upcoming Tickets"
              />
            ) : null}

            {pastTickets.length > 0 ? (
              <TicketGroup
                onViewTicket={setSelectedTicketId}
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
  onBack,
  ticket,
}: {
  onBack: () => void
  ticket: MyTicket
}) {
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

  return (
    <div className="my-ticket-detail-view">
      <button
        type="button"
        className="secondary-action-button"
        onClick={onBack}
      >
        Back to My Tickets
      </button>

      <article className="my-ticket-detail" aria-label="Ticket details">
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

        <div className="my-ticket-qr-zone">
          <p>QR ticket code will appear here once scanning is added.</p>
        </div>

        <div className="my-ticket-divider" aria-hidden="true" />

        <div className="my-ticket-detail-body">
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
            <div>
              <dt>Status</dt>
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
                to={`/events/${event.slug}`}
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
