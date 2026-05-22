import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../account/auth-context'
import { fetchUserProfile } from '../account/userProfile'
import {
  fetchCheckoutTicketStatus,
  type CheckoutTicketStatus,
} from './checkoutTicketStatus'

type FanTicketLinkStatus = 'hidden' | 'loading' | 'visible'
type CheckoutStatusLoadState = 'idle' | 'loading' | 'ready' | 'error'

export function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams()
  const { isLoading, session } = useAuth()
  const sessionId = searchParams.get('session_id')?.trim() ?? ''
  const reservationId = searchParams.get('reservation_id')?.trim() ?? ''
  const guestCheckoutParam = searchParams.get('guest_checkout')
  const ticketEmailParam = searchParams.get('ticket_email')
  const [fanTicketLinkStatus, setFanTicketLinkStatus] =
    useState<FanTicketLinkStatus>('hidden')
  const [checkoutStatus, setCheckoutStatus] =
    useState<CheckoutTicketStatus | null>(null)
  const [checkoutStatusLoadState, setCheckoutStatusLoadState] =
    useState<CheckoutStatusLoadState>('idle')
  const isGuestCheckout =
    checkoutStatus?.isGuestCheckout ??
    (guestCheckoutParam === '1' ||
      (!guestCheckoutParam && !isLoading && !session))
  const isGuestTicketEmailConfigured =
    isGuestCheckout &&
    (checkoutStatus?.ticketEmailConfigured ?? ticketEmailParam === 'configured')
  const ticketEmailError = checkoutStatus?.ticketEmailError?.trim() ?? ''
  const showGuestEmailSuccess =
    isGuestCheckout && isGuestTicketEmailConfigured && !ticketEmailError

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

    async function loadCheckoutStatus() {
      setCheckoutStatusLoadState('loading')

      try {
        const nextCheckoutStatus = await fetchCheckoutTicketStatus({
          reservationId,
          sessionId,
        })

        if (isMounted) {
          setCheckoutStatus(nextCheckoutStatus)
          setCheckoutStatusLoadState('ready')
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
    }
  }, [reservationId, sessionId])

  return (
    <section className="checkout-return-page">
      <div className="checkout-return-card is-success">
        <span className="checkout-return-kicker">Stripe Checkout</span>
        <h2>{isGuestCheckout ? 'Payment successful.' : 'Payment received.'}</h2>

        {sessionId ? (
          showGuestEmailSuccess ? (
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
