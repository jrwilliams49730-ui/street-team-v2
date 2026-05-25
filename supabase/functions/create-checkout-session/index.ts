import Stripe from 'npm:stripe@19.2.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type ReservationRow = {
  id: string
  event_id: string
  ticket_type_id: string
  buyer_email: string | null
  purchaser_user_id: string | null
  quantity: number
  reservation_status: string
  sales_channel: string | null
  processing_fee_cents_snapshot: number
  street_team_fee_cents_snapshot: number
  ticket_subtotal_cents_snapshot: number
  ticket_kind_snapshot: string
  total_price_cents_snapshot: number
  unit_price_cents_snapshot: number
  expires_at: string | null
}

type EventRow = {
  id: string
  title: string
  status: string
}

type TicketTypeRow = {
  id: string
  name: string
}

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })

const errorResponse = (message: string, status = 400, code = 'error') =>
  jsonResponse({ error: { code, message } }, status)

const getRequiredEnv = (name: string) => {
  const value = Deno.env.get(name)

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

const isValidEmail = (value: string | null) =>
  Boolean(
    value?.trim().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  )

const isTicketEmailConfigured = () =>
  Boolean(
    Deno.env.get('RESEND_API_KEY') &&
      (Deno.env.get('TICKET_EMAIL_FROM') ?? Deno.env.get('EMAIL_FROM')),
  )

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return errorResponse('Method not allowed.', 405, 'method_not_allowed')
  }

  let stripeSecretKey: string
  let appUrl: string
  let supabaseUrl: string
  let supabaseServiceRoleKey: string

  try {
    stripeSecretKey = getRequiredEnv('STRIPE_SECRET_KEY')
    appUrl = getRequiredEnv('APP_URL').replace(/\/$/, '')
    supabaseUrl = getRequiredEnv('SUPABASE_URL')
    supabaseServiceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server configuration is incomplete.'
    return errorResponse(message, 500, 'configuration_error')
  }

  let reservationId: unknown

  try {
    const body = await request.json()
    reservationId = body?.reservationId
  } catch {
    return errorResponse('Request body must be valid JSON.', 400, 'invalid_json')
  }

  if (typeof reservationId !== 'string' || reservationId.trim() === '') {
    return errorResponse('reservationId is required.', 400, 'missing_reservation_id')
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const { data: reservation, error: reservationError } = await supabase
    .from('ticket_reservations')
    .select(
      'id,event_id,ticket_type_id,buyer_email,purchaser_user_id,quantity,reservation_status,sales_channel,processing_fee_cents_snapshot,street_team_fee_cents_snapshot,ticket_kind_snapshot,ticket_subtotal_cents_snapshot,total_price_cents_snapshot,unit_price_cents_snapshot,expires_at',
    )
    .eq('id', reservationId.trim())
    .maybeSingle<ReservationRow>()

  if (reservationError) {
    return errorResponse(reservationError.message, 500, 'reservation_lookup_failed')
  }

  if (!reservation) {
    return errorResponse('Reservation not found.', 404, 'reservation_not_found')
  }

  if (reservation.reservation_status !== 'pending') {
    return errorResponse('Reservation is not pending.', 409, 'reservation_not_pending')
  }

  if (reservation.ticket_kind_snapshot !== 'paid') {
    return errorResponse('Reservation is not for a paid ticket.', 409, 'reservation_not_paid')
  }

  const isGuestCheckout = !reservation.purchaser_user_id
  const isDoorSale = reservation.sales_channel === 'door'

  if (!isDoorSale && !isValidEmail(reservation.buyer_email)) {
    return errorResponse('A valid buyer email is required.', 409, 'invalid_buyer_email')
  }

  if (!reservation.expires_at || new Date(reservation.expires_at).getTime() <= Date.now()) {
    return errorResponse('Reservation has expired.', 409, 'reservation_expired')
  }

  if (
    !Number.isInteger(reservation.quantity) ||
    reservation.quantity <= 0 ||
    !Number.isInteger(reservation.processing_fee_cents_snapshot) ||
    reservation.processing_fee_cents_snapshot < 0 ||
    !Number.isInteger(reservation.street_team_fee_cents_snapshot) ||
    reservation.street_team_fee_cents_snapshot < 0 ||
    !Number.isInteger(reservation.ticket_subtotal_cents_snapshot) ||
    reservation.ticket_subtotal_cents_snapshot < 0 ||
    !Number.isInteger(reservation.total_price_cents_snapshot) ||
    reservation.total_price_cents_snapshot <= 0 ||
    !Number.isInteger(reservation.unit_price_cents_snapshot) ||
    reservation.unit_price_cents_snapshot <= 0
  ) {
    return errorResponse('Reservation pricing or quantity is invalid.', 409, 'invalid_reservation_pricing')
  }

  const feeBreakdownTotal =
    reservation.ticket_subtotal_cents_snapshot +
    reservation.street_team_fee_cents_snapshot +
    reservation.processing_fee_cents_snapshot

  if (feeBreakdownTotal !== reservation.total_price_cents_snapshot) {
    return errorResponse(
      'Reservation fee breakdown does not match reservation total.',
      409,
      'reservation_fee_breakdown_mismatch',
    )
  }

  const lineItemTotal =
    reservation.unit_price_cents_snapshot * reservation.quantity +
    100 * reservation.quantity +
    reservation.processing_fee_cents_snapshot

  if (lineItemTotal !== reservation.total_price_cents_snapshot) {
    return errorResponse(
      'Reservation line item total does not match reservation total.',
      409,
      'reservation_line_item_total_mismatch',
    )
  }

  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id,title,status')
    .eq('id', reservation.event_id)
    .maybeSingle<EventRow>()

  if (eventError) {
    return errorResponse(eventError.message, 500, 'event_lookup_failed')
  }

  if (!event) {
    return errorResponse('Event not found.', 404, 'event_not_found')
  }

  if (event.status !== 'published') {
    return errorResponse('Event is not published.', 409, 'event_not_published')
  }

  const { data: ticketType, error: ticketTypeError } = await supabase
    .from('event_ticket_types')
    .select('id,name')
    .eq('id', reservation.ticket_type_id)
    .maybeSingle<TicketTypeRow>()

  if (ticketTypeError) {
    return errorResponse(ticketTypeError.message, 500, 'ticket_type_lookup_failed')
  }

  if (!ticketType) {
    return errorResponse('Ticket type not found.', 404, 'ticket_type_not_found')
  }

  const metadata = {
    reservation_id: reservation.id,
    event_id: reservation.event_id,
    ticket_type_id: reservation.ticket_type_id,
    sales_channel: reservation.sales_channel ?? 'online',
  }
  console.log('[create-checkout-session] paid reservation ready for Stripe:', {
    buyerEmail: reservation.buyer_email,
    isDoorSale,
    isGuestCheckout,
    metadata,
    reservationId: reservation.id,
  })

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2026-02-25.clover',
    httpClient: Stripe.createFetchHttpClient(),
  })

  try {
    const expiresAt = Math.floor(Date.now() / 1000) + 30 * 60
    const ticketEmailStatus = isTicketEmailConfigured()
      ? 'configured'
      : 'not_configured'
    const successUrl = isDoorSale
      ? `${appUrl}/account?tab=my-events` +
        `&manage_event_id=${encodeURIComponent(reservation.event_id)}` +
        '&manage_tab=box-office' +
        '&source=box_office' +
        '&door_sale=1' +
        `&reservation_id=${encodeURIComponent(reservation.id)}` +
        '&session_id={CHECKOUT_SESSION_ID}' +
        `&ticket_email=${ticketEmailStatus}`
      : `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}` +
        `&reservation_id=${encodeURIComponent(reservation.id)}` +
        `&guest_checkout=${isGuestCheckout ? '1' : '0'}` +
        '&door_sale=0' +
        `&ticket_email=${ticketEmailStatus}`
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${event.title} - ${ticketType.name}`,
          },
          unit_amount: reservation.unit_price_cents_snapshot,
        },
        quantity: reservation.quantity,
      },
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Street Team Service Fee',
          },
          unit_amount: 100,
        },
        quantity: reservation.quantity,
      },
    ]

    if (reservation.processing_fee_cents_snapshot > 0) {
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Payment Processing Fee',
          },
          unit_amount: reservation.processing_fee_cents_snapshot,
        },
        quantity: 1,
      })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: isValidEmail(reservation.buyer_email)
        ? reservation.buyer_email ?? undefined
        : undefined,
      client_reference_id: reservation.id,
      line_items: lineItems,
      success_url: successUrl,
      cancel_url:
        `${appUrl}/checkout/cancelled?reservation_id=${reservation.id}` +
        `&door_sale=${isDoorSale ? '1' : '0'}`,
      metadata,
      payment_intent_data: {
        metadata,
      },
      expires_at: expiresAt,
    })

    if (!session.url) {
      return errorResponse('Stripe did not return a checkout URL.', 502, 'checkout_url_missing')
    }

    const { error: updateError } = await supabase
      .from('ticket_reservations')
      .update({
        stripe_checkout_session_id: session.id,
        expires_at: new Date(session.expires_at * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', reservation.id)

    if (updateError) {
      return errorResponse(updateError.message, 500, 'reservation_update_failed')
    }

    return jsonResponse({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create Stripe Checkout Session.'
    return errorResponse(message, 502, 'stripe_checkout_failed')
  }
})
