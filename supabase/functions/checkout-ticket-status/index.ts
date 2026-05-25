import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type ReservationStatusRow = {
  id: string
  buyer_name: string | null
  buyer_email: string | null
  event_id: string
  purchaser_user_id: string | null
  quantity: number
  reservation_status: string
  sales_channel: string | null
  stripe_checkout_session_id: string | null
  ticket_type_id: string
  ticket_email_error: string | null
  ticket_email_last_attempted_at: string | null
  ticket_email_sent_at: string | null
  total_price_cents_snapshot: number
}

type TicketStatusRow = {
  checked_in_at: string | null
  id: string
  qr_token: string
  ticket_number: number
  ticket_status: string
}

type EventStatusRow = {
  title: string
}

type TicketTypeStatusRow = {
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

  let appUrl: string
  let supabaseUrl: string
  let supabaseServiceRoleKey: string

  try {
    appUrl = getRequiredEnv('APP_URL').replace(/\/$/, '')
    supabaseUrl = getRequiredEnv('SUPABASE_URL')
    supabaseServiceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Server configuration is incomplete.'
    return errorResponse(message, 500, 'configuration_error')
  }

  let reservationId: unknown
  let sessionId: unknown

  try {
    const body = await request.json()
    reservationId = body?.reservationId
    sessionId = body?.sessionId
  } catch {
    return errorResponse('Request body must be valid JSON.', 400, 'invalid_json')
  }

  const cleanReservationId =
    typeof reservationId === 'string' ? reservationId.trim() : ''
  const cleanSessionId = typeof sessionId === 'string' ? sessionId.trim() : ''

  if (!cleanReservationId && !cleanSessionId) {
    return errorResponse(
      'sessionId or reservationId is required.',
      400,
      'missing_checkout_reference',
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  let query = supabase
    .from('ticket_reservations')
    .select(
      'id,buyer_name,buyer_email,event_id,purchaser_user_id,quantity,reservation_status,sales_channel,stripe_checkout_session_id,ticket_type_id,ticket_email_error,ticket_email_last_attempted_at,ticket_email_sent_at,total_price_cents_snapshot',
    )

  query = cleanReservationId
    ? query.eq('id', cleanReservationId)
    : query.eq('stripe_checkout_session_id', cleanSessionId)

  const { data: reservation, error: reservationError } =
    await query.maybeSingle<ReservationStatusRow>()

  if (reservationError) {
    return errorResponse(
      reservationError.message,
      500,
      'reservation_lookup_failed',
    )
  }

  if (!reservation) {
    return errorResponse('Reservation not found.', 404, 'reservation_not_found')
  }

  const [
    { data: event, error: eventError },
    { data: ticketType, error: ticketTypeError },
    { data: tickets, error: ticketsError },
  ] = await Promise.all([
    supabase
      .from('events')
      .select('title')
      .eq('id', reservation.event_id)
      .maybeSingle<EventStatusRow>(),
    supabase
      .from('event_ticket_types')
      .select('name')
      .eq('id', reservation.ticket_type_id)
      .maybeSingle<TicketTypeStatusRow>(),
    supabase
      .from('tickets')
      .select('checked_in_at,id,qr_token,ticket_number,ticket_status')
      .eq('reservation_id', reservation.id)
      .order('ticket_number', { ascending: true }),
  ])

  if (eventError) {
    return errorResponse(eventError.message, 500, 'event_lookup_failed')
  }

  if (ticketTypeError) {
    return errorResponse(ticketTypeError.message, 500, 'ticket_type_lookup_failed')
  }

  if (ticketsError) {
    return errorResponse(ticketsError.message, 500, 'ticket_lookup_failed')
  }

  const ticketRows = (tickets ?? []) as TicketStatusRow[]

  return jsonResponse({
    buyerName: reservation.buyer_name,
    buyerEmail: reservation.buyer_email,
    eventId: reservation.event_id,
    eventTitle: event?.title ?? null,
    isGuestCheckout: !reservation.purchaser_user_id,
    quantity: reservation.quantity,
    reservationId: reservation.id,
    reservationStatus: reservation.reservation_status,
    salesChannel: reservation.sales_channel ?? 'online',
    stripeCheckoutSessionId: reservation.stripe_checkout_session_id,
    ticketEmailConfigured: isTicketEmailConfigured(),
    ticketEmailError: reservation.ticket_email_error,
    ticketEmailLastAttemptedAt: reservation.ticket_email_last_attempted_at,
    ticketEmailSentAt: reservation.ticket_email_sent_at,
    ticketTypeName: ticketType?.name ?? null,
    totalPriceCents: reservation.total_price_cents_snapshot,
    tickets: ticketRows.map((ticket) => ({
      checkedInAt: ticket.checked_in_at,
      id: ticket.id,
      qrToken: ticket.qr_token,
      ticketNumber: ticket.ticket_number,
      ticketStatus: ticket.ticket_status,
      ticketUrl: `${appUrl}/tickets/${ticket.qr_token}`,
    })),
  })
})
