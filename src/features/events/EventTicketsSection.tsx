import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../account/auth-context'
import { fetchUserProfile } from '../account/userProfile'
import {
  claimFreeTicket,
  fetchEventTicketTypes,
  formatTicketKind,
  formatTicketPrice,
  type EventTicketType,
} from './eventTickets'

type EventTicketsSectionProps = {
  eventId: string
}

type ClaimFormState = {
  buyerEmail: string
  buyerName: string
  quantity: string
}

type ClaimMessage = {
  ticketTypeId: string
  type: 'success' | 'error'
  text: string
}

const emptyClaimForm: ClaimFormState = {
  buyerEmail: '',
  buyerName: '',
  quantity: '1',
}

function EventTicketsSection({ eventId }: EventTicketsSectionProps) {
  const { session } = useAuth()
  const [ticketTypes, setTicketTypes] = useState<EventTicketType[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [defaultBuyerName, setDefaultBuyerName] = useState('')
  const [defaultBuyerEmail, setDefaultBuyerEmail] = useState('')
  const [activeTicketTypeId, setActiveTicketTypeId] = useState<string | null>(
    null,
  )
  const [claimForm, setClaimForm] = useState<ClaimFormState>(emptyClaimForm)
  const [claimMessage, setClaimMessage] = useState<ClaimMessage | null>(null)
  const [claimingTicketTypeId, setClaimingTicketTypeId] = useState<
    string | null
  >(null)

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

  useEffect(() => {
    let isMounted = true

    async function loadBuyerDefaults() {
      if (!session) {
        setDefaultBuyerName('')
        setDefaultBuyerEmail('')
        return
      }

      setDefaultBuyerEmail(session.user.email ?? '')

      try {
        const profile = await fetchUserProfile(session.user.id)

        if (isMounted) {
          setDefaultBuyerName(profile.displayName)
        }
      } catch {
        if (isMounted) {
          setDefaultBuyerName('')
        }
      }
    }

    void loadBuyerDefaults()

    return () => {
      isMounted = false
    }
  }, [session])

  function openClaimForm(ticketTypeId: string) {
    setActiveTicketTypeId(ticketTypeId)
    setClaimForm({
      buyerEmail: defaultBuyerEmail,
      buyerName: defaultBuyerName,
      quantity: '1',
    })
    setClaimMessage(null)
  }

  function closeClaimForm() {
    setActiveTicketTypeId(null)
    setClaimForm(emptyClaimForm)
  }

  async function handleClaimSubmit(
    event: FormEvent<HTMLFormElement>,
    ticketType: EventTicketType,
  ) {
    event.preventDefault()

    const quantity = parseTicketQuantity(claimForm.quantity)

    if (!quantity) {
      setClaimMessage({
        ticketTypeId: ticketType.id,
        text: 'Enter a valid ticket quantity of at least 1.',
        type: 'error',
      })
      return
    }

    const buyerName = claimForm.buyerName.trim()
    const buyerEmail = claimForm.buyerEmail.trim()

    if (!buyerName) {
      setClaimMessage({
        ticketTypeId: ticketType.id,
        text: 'Buyer name is required.',
        type: 'error',
      })
      return
    }

    if (!buyerEmail || buyerEmail.indexOf('@') <= 0) {
      setClaimMessage({
        ticketTypeId: ticketType.id,
        text: 'A valid buyer email is required.',
        type: 'error',
      })
      return
    }

    setClaimingTicketTypeId(ticketType.id)
    setClaimMessage(null)

    try {
      await claimFreeTicket({
        buyerEmail,
        buyerName,
        quantity,
        ticketTypeId: ticketType.id,
      })

      setActiveTicketTypeId(null)
      setClaimForm(emptyClaimForm)
      setClaimMessage({
        ticketTypeId: ticketType.id,
        text: `Your free ticket has been claimed. ${ticketType.name} x ${quantity} for ${buyerEmail}.`,
        type: 'success',
      })
    } catch (error) {
      setClaimMessage({
        ticketTypeId: ticketType.id,
        text:
          error instanceof Error
            ? error.message
            : 'Ticket could not be claimed. Please try again.',
        type: 'error',
      })
    } finally {
      setClaimingTicketTypeId(null)
    }
  }

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

                {ticketType.ticketKind === 'free' ? (
                  <div className="ticket-claim-area">
                    {claimMessage?.ticketTypeId === ticketType.id ? (
                      <p className={`auth-message ${claimMessage.type}`}>
                        {claimMessage.text}
                      </p>
                    ) : null}

                    {activeTicketTypeId === ticketType.id ? (
                      <form
                        className="ticket-claim-form"
                        onSubmit={(event) =>
                          handleClaimSubmit(event, ticketType)
                        }
                      >
                        <label>
                          <span>Ticket quantity</span>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={claimForm.quantity}
                            onChange={(event) =>
                              setClaimForm((currentForm) => ({
                                ...currentForm,
                                quantity: event.target.value,
                              }))
                            }
                            required
                          />
                        </label>

                        <label>
                          <span>Buyer name</span>
                          <input
                            type="text"
                            value={claimForm.buyerName}
                            onChange={(event) =>
                              setClaimForm((currentForm) => ({
                                ...currentForm,
                                buyerName: event.target.value,
                              }))
                            }
                            required
                          />
                        </label>

                        <label>
                          <span>Buyer email</span>
                          <input
                            type="email"
                            value={claimForm.buyerEmail}
                            onChange={(event) =>
                              setClaimForm((currentForm) => ({
                                ...currentForm,
                                buyerEmail: event.target.value,
                              }))
                            }
                            required
                          />
                        </label>

                        <div className="ticket-claim-actions">
                          <button
                            type="submit"
                            className="auth-submit-button"
                            disabled={claimingTicketTypeId === ticketType.id}
                          >
                            {claimingTicketTypeId === ticketType.id
                              ? 'Claiming...'
                              : 'Claim Free Ticket'}
                          </button>

                          <button
                            type="button"
                            className="secondary-action-button"
                            disabled={claimingTicketTypeId === ticketType.id}
                            onClick={closeClaimForm}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        className="auth-submit-button"
                        onClick={() => openClaimForm(ticketType.id)}
                      >
                        Claim Free Ticket
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="ticket-placeholder">
                    Paid checkout coming next.
                  </p>
                )}
              </article>
            ))}
          </div>
        </>
      ) : null}
    </section>
  )
}

function parseTicketQuantity(value: string) {
  const trimmed = value.trim()

  if (!/^\d+$/.test(trimmed)) {
    return null
  }

  const quantity = Number.parseInt(trimmed, 10)

  return quantity >= 1 ? quantity : null
}

export default EventTicketsSection
