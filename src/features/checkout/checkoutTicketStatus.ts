import { publicSupabase } from '../../lib/supabase'

export type CheckoutTicketStatus = {
  buyerName: string | null
  buyerEmail: string | null
  eventTitle: string | null
  isGuestCheckout: boolean
  quantity: number
  reservationId: string
  reservationStatus: string
  salesChannel: string
  stripeCheckoutSessionId: string | null
  ticketEmailConfigured: boolean
  ticketEmailError: string | null
  ticketEmailLastAttemptedAt: string | null
  ticketEmailSentAt: string | null
  ticketTypeName: string | null
  totalPriceCents: number
  tickets: Array<{
    checkedInAt: string | null
    id: string
    qrToken: string
    ticketNumber: number
    ticketStatus: string
    ticketUrl: string
  }>
}

export async function fetchCheckoutTicketStatus({
  reservationId,
  sessionId,
}: {
  reservationId: string
  sessionId: string
}) {
  const { data, error } =
    await publicSupabase.functions.invoke<CheckoutTicketStatus>(
      'checkout-ticket-status',
      {
        body: {
          reservationId: reservationId || undefined,
          sessionId: sessionId || undefined,
        },
      },
    )

  if (error) {
    throw new Error(
      (await getFunctionErrorMessage(error)) ??
        'Ticket email status could not be loaded.',
    )
  }

  if (!data) {
    throw new Error('Ticket email status could not be loaded.')
  }

  return data
}

async function getFunctionErrorMessage(error: unknown) {
  if (
    typeof error === 'object' &&
    error !== null &&
    'context' in error &&
    error.context instanceof Response
  ) {
    try {
      const body = (await error.context.clone().json()) as unknown
      const message = extractFunctionErrorMessage(body)

      if (message) {
        return message
      }
    } catch {
      // Fall through to the standard client error message below.
    }
  }

  return error instanceof Error ? error.message : null
}

function extractFunctionErrorMessage(body: unknown) {
  if (typeof body === 'string' && body.trim()) {
    return body
  }

  if (!body || typeof body !== 'object') {
    return null
  }

  if ('message' in body && typeof body.message === 'string') {
    return body.message
  }

  if (
    'error' in body &&
    body.error &&
    typeof body.error === 'object' &&
    'message' in body.error &&
    typeof body.error.message === 'string'
  ) {
    return body.error.message
  }

  return null
}
