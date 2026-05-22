import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type ReservationStatusRow = {
  id: string
  buyer_email: string | null
  purchaser_user_id: string | null
  reservation_status: string
  stripe_checkout_session_id: string | null
  ticket_email_error: string | null
  ticket_email_last_attempted_at: string | null
  ticket_email_sent_at: string | null
}

type TicketStatusRow = {
  id: string
  qr_token: string
  ticket_number: number
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
      'id,buyer_email,purchaser_user_id,reservation_status,stripe_checkout_session_id,ticket_email_error,ticket_email_last_attempted_at,ticket_email_sent_at',
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

  const { data: tickets, error: ticketsError } = await supabase
    .from('tickets')
    .select('id,qr_token,ticket_number')
    .eq('reservation_id', reservation.id)
    .order('ticket_number', { ascending: true })

  if (ticketsError) {
    return errorResponse(ticketsError.message, 500, 'ticket_lookup_failed')
  }

  const ticketRows = (tickets ?? []) as TicketStatusRow[]

  return jsonResponse({
    buyerEmail: reservation.buyer_email,
    isGuestCheckout: !reservation.purchaser_user_id,
    reservationId: reservation.id,
    reservationStatus: reservation.reservation_status,
    stripeCheckoutSessionId: reservation.stripe_checkout_session_id,
    ticketEmailConfigured: isTicketEmailConfigured(),
    ticketEmailError: reservation.ticket_email_error,
    ticketEmailLastAttemptedAt: reservation.ticket_email_last_attempted_at,
    ticketEmailSentAt: reservation.ticket_email_sent_at,
    tickets: ticketRows.map((ticket) => ({
      id: ticket.id,
      ticketNumber: ticket.ticket_number,
      ticketUrl: `${appUrl}/tickets/${ticket.qr_token}`,
    })),
  })
})
