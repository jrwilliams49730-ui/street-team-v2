import { useEffect, useMemo, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Link, useParams } from 'react-router-dom'
import {
  fetchPublicTicketByQrToken,
  formatTicketQrValue,
  formatIndividualTicketStatus,
  type PublicTicket,
} from '../events/eventTickets'
import { formatEventDate, formatEventTime } from '../events/events'

type GuestTicketStatus = 'loading' | 'ready' | 'not-found' | 'error'

function GuestTicketPage() {
  const { qrToken = '' } = useParams()
  const [ticket, setTicket] = useState<PublicTicket | null>(null)
  const [status, setStatus] = useState<GuestTicketStatus>('loading')

  useEffect(() => {
    const cleanQrToken = qrToken.trim()
    let isMounted = true

    async function loadTicket() {
      if (!cleanQrToken) {
        setTicket(null)
        setStatus('not-found')
        return
      }

      setStatus('loading')

      try {
        const nextTicket = await fetchPublicTicketByQrToken(cleanQrToken)

        if (isMounted) {
          setTicket(nextTicket)
          setStatus(nextTicket ? 'ready' : 'not-found')
        }
      } catch {
        if (isMounted) {
          setTicket(null)
          setStatus('error')
        }
      }
    }

    void loadTicket()

    return () => {
      isMounted = false
    }
  }, [qrToken])

  const ticketLocation = useMemo(
    () => (ticket ? formatPublicTicketLocation(ticket) : ''),
    [ticket],
  )
  const ticketPosition =
    ticket && ticket.quantity > 1
      ? `Ticket ${ticket.ticketNumber} of ${ticket.quantity}`
      : ''

  return (
    <section className="guest-ticket-page">
      {status === 'loading' ? (
        <div className="guest-ticket-card">
          <span className="checkout-return-kicker">Street Team Ticket</span>
          <h2>Loading ticket...</h2>
        </div>
      ) : null}

      {status === 'error' ? (
        <div className="guest-ticket-card">
          <span className="checkout-return-kicker">Street Team Ticket</span>
          <h2>Ticket unavailable.</h2>
          <p>This ticket could not be loaded right now.</p>
          <Link to="/events" className="auth-submit-button">
            Return to Events
          </Link>
        </div>
      ) : null}

      {status === 'not-found' ? (
        <div className="guest-ticket-card">
          <span className="checkout-return-kicker">Street Team Ticket</span>
          <h2>Ticket not found.</h2>
          <p>This ticket link is invalid or no longer available.</p>
          <Link to="/events" className="auth-submit-button">
            Return to Events
          </Link>
        </div>
      ) : null}

      {status === 'ready' && ticket ? (
        <article className="guest-ticket-card" aria-label="Ticket details">
          <header className="guest-ticket-header">
            <span className="checkout-return-kicker">Street Team Ticket</span>
            <h2>{ticket.eventTitle}</h2>
            <p>{ticket.ticketTypeName}</p>
            {ticketPosition ? (
              <span className="guest-ticket-position">{ticketPosition}</span>
            ) : null}
          </header>

          <div
            className={`guest-ticket-qr-zone${
              ticket.ticketStatus === 'void' ? ' is-void' : ''
            }`}
          >
            <QRCodeSVG
              value={formatTicketQrValue(ticket.qrToken)}
              title="Street Team ticket QR code"
              size={288}
              level="H"
              marginSize={6}
              bgColor="#ffffff"
              fgColor="#000000"
              className="my-ticket-qr-code"
            />
          </div>

          <dl className="guest-ticket-details">
            <div>
              <dt>Date</dt>
              <dd>{formatEventDate(ticket.eventDate)}</dd>
            </div>
            <div>
              <dt>Time</dt>
              <dd>
                {ticket.startTime ? formatEventTime(ticket.startTime) : 'Time TBA'}
              </dd>
            </div>
            <div className="is-wide">
              <dt>Venue / Location</dt>
              <dd>{ticketLocation}</dd>
            </div>
            <div>
              <dt>Ticket holder</dt>
              <dd>{ticket.buyerName}</dd>
            </div>
            <div>
              <dt>Buyer email</dt>
              <dd>{ticket.buyerEmail || 'No email provided'}</dd>
            </div>
            <div>
              <dt>Ticket</dt>
              <dd>
                {ticket.ticketNumber} of {ticket.quantity}
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{formatIndividualTicketStatus(ticket.ticketStatus)}</dd>
            </div>
          </dl>

          <div className="guest-ticket-actions">
            {ticket.quantity > 1 &&
            (ticket.previousQrToken || ticket.nextQrToken) ? (
              <>
                {ticket.previousQrToken ? (
                  <Link
                    to={`/tickets/${ticket.previousQrToken}`}
                    className="secondary-action-button"
                  >
                    Previous ticket
                  </Link>
                ) : (
                  <span
                    className="secondary-action-button is-disabled"
                    aria-disabled="true"
                  >
                    Previous ticket
                  </span>
                )}
                {ticket.nextQrToken ? (
                  <Link
                    to={`/tickets/${ticket.nextQrToken}`}
                    className="secondary-action-button"
                  >
                    Next ticket
                  </Link>
                ) : (
                  <span
                    className="secondary-action-button is-disabled"
                    aria-disabled="true"
                  >
                    Next ticket
                  </span>
                )}
              </>
            ) : null}
            {ticket.eventSlug ? (
              <Link
                to={`/events/${ticket.eventSlug}`}
                className="secondary-action-button"
              >
                Open event page
              </Link>
            ) : null}
          </div>
        </article>
      ) : null}
    </section>
  )
}

function formatPublicTicketLocation(ticket: PublicTicket) {
  const cityState = [ticket.city, ticket.state]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ')
  const address = [ticket.addressLine1, ticket.addressLine2]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ')

  return [ticket.venueName, address, cityState, ticket.postalCode, ticket.country]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' | ')
}

export default GuestTicketPage
