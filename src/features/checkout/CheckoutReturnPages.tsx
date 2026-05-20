import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../account/auth-context'
import { fetchUserProfile } from '../account/userProfile'

type FanTicketLinkStatus = 'hidden' | 'loading' | 'visible'

export function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams()
  const { session } = useAuth()
  const sessionId = searchParams.get('session_id')?.trim() ?? ''
  const [fanTicketLinkStatus, setFanTicketLinkStatus] =
    useState<FanTicketLinkStatus>('hidden')

  useEffect(() => {
    let isMounted = true

    async function loadAccountType() {
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
  }, [session])

  return (
    <section className="checkout-return-page">
      <div className="checkout-return-card is-success">
        <span className="checkout-return-kicker">Stripe Checkout</span>
        <h2>Payment received.</h2>

        {sessionId ? (
          <p>
            We&rsquo;re finalizing your tickets now. Once payment confirmation
            finishes, your tickets will be available if they were purchased
            through a signed-in fan account.
          </p>
        ) : (
          <p>
            Checkout completed, but we could not read the session reference
            from the return link.
          </p>
        )}

        <p className="checkout-return-note">
          If you checked out as a guest, your ticket confirmation will be
          handled by email once ticket email delivery is added.
        </p>

        <div className="checkout-return-actions">
          <Link to="/events" className="auth-submit-button">
            Return to Events
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

export function CheckoutCancelledPage() {
  const [searchParams] = useSearchParams()
  const reservationId = searchParams.get('reservation_id')?.trim() ?? ''

  return (
    <section className="checkout-return-page">
      <div className="checkout-return-card is-cancelled">
        <span className="checkout-return-kicker">Stripe Checkout</span>
        <h2>Checkout cancelled.</h2>
        <p>
          No payment was completed. Your pending ticket hold will expire
          automatically if you do not return to checkout.
        </p>

        {reservationId ? (
          <p className="checkout-return-small">
            Reservation reference saved from the return link.
          </p>
        ) : null}

        <div className="checkout-return-actions">
          <Link to="/events" className="auth-submit-button">
            Return to Events
          </Link>
        </div>
      </div>
    </section>
  )
}
