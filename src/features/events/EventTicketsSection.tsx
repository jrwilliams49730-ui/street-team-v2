import { useEffect, useState } from 'react'
import {
  fetchEventTicketTypes,
  formatTicketKind,
  formatTicketPrice,
  type EventTicketType,
} from './eventTickets'

type EventTicketsSectionProps = {
  eventId: string
}

function EventTicketsSection({ eventId }: EventTicketsSectionProps) {
  const [ticketTypes, setTicketTypes] = useState<EventTicketType[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )

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

  return (
    <section className="event-detail-panel event-tickets-panel">
      <h3>Tickets</h3>

      {status === 'loading' ? <p>Loading ticket details...</p> : null}

      {status === 'error' ? <p>Ticket details could not be loaded.</p> : null}

      {status === 'ready' && ticketTypes.length === 0 ? (
        <p>Ticket details have not been added yet.</p>
      ) : null}

      {status === 'ready' && ticketTypes.length > 0 ? (
        <>
          <div className="ticket-type-list">
            {ticketTypes.map((ticketType) => (
              <article key={ticketType.id} className="ticket-type-card">
                <div className="ticket-type-copy">
                  <div className="ticket-type-heading">
                    <h4>{ticketType.name}</h4>
                    <span
                      className={`ticket-kind-badge is-${ticketType.ticketKind}`}
                    >
                      {formatTicketKind(ticketType.ticketKind)}
                    </span>
                  </div>

                  {ticketType.description ? (
                    <p>{ticketType.description}</p>
                  ) : null}

                  {ticketType.ticketKind === 'paid' ? (
                    <p>{formatTicketPrice(ticketType.priceCents)}</p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          <p className="ticket-placeholder">
            Ticket claiming and checkout are coming next.
          </p>
        </>
      ) : null}
    </section>
  )
}

export default EventTicketsSection
