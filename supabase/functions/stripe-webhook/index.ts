import Stripe from 'npm:stripe@19.2.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

type SupabaseServiceClient = ReturnType<typeof createClient>

type ReservationEmailRow = {
  id: string
  event_id: string
  ticket_type_id: string
  buyer_name: string
  buyer_email: string | null
  quantity: number
  ticket_email_sent_at: string | null
}

type EventEmailRow = {
  title: string
  event_date: string
  start_time: string | null
  event_timezone: string | null
  venue_name: string
  address_line_1: string | null
  address_line_2: string | null
  city: string
  state: string
  postal_code: string | null
  country: string | null
}

type TicketTypeEmailRow = {
  name: string
}

type TicketEmailRow = {
  id: string
  ticket_number: number
  ticket_status: string
  qr_token: string
}

type TicketEmailDetails = {
  event: EventEmailRow
  reservation: ReservationEmailRow
  ticketType: TicketTypeEmailRow
  tickets: TicketEmailRow[]
}

const jsonHeaders = {
  'Content-Type': 'application/json',
}

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
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

const getPaymentIntentId = (
  paymentIntent: string | Stripe.PaymentIntent | null,
) => {
  if (!paymentIntent) {
    return null
  }

  return typeof paymentIntent === 'string' ? paymentIntent : paymentIntent.id
}

const isValidEmail = (value: string | null) =>
  Boolean(value?.trim().match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))

async function fetchTicketEmailDetails(
  supabase: SupabaseServiceClient,
  reservationId: string,
) {
  const { data: reservation, error: reservationError } = await supabase
    .from('ticket_reservations')
    .select(
      'id,event_id,ticket_type_id,buyer_name,buyer_email,quantity,ticket_email_sent_at',
    )
    .eq('id', reservationId)
    .maybeSingle<ReservationEmailRow>()

  if (reservationError) {
    throw reservationError
  }

  if (!reservation) {
    throw new Error(
      'Reservation was confirmed, but ticket email reservation details were not found.',
    )
  }

  const [
    { data: event, error: eventError },
    { data: ticketType, error: ticketTypeError },
    { data: tickets, error: ticketsError },
  ] = await Promise.all([
    supabase
      .from('events')
      .select(
        'title,event_date,start_time,event_timezone,venue_name,address_line_1,address_line_2,city,state,postal_code,country',
      )
      .eq('id', reservation.event_id)
      .maybeSingle<EventEmailRow>(),
    supabase
      .from('event_ticket_types')
      .select('name')
      .eq('id', reservation.ticket_type_id)
      .maybeSingle<TicketTypeEmailRow>(),
    supabase
      .from('tickets')
      .select('id,ticket_number,ticket_status,qr_token')
      .eq('reservation_id', reservation.id)
      .order('ticket_number', { ascending: true }),
  ])

  if (eventError) {
    throw eventError
  }

  if (ticketTypeError) {
    throw ticketTypeError
  }

  if (ticketsError) {
    throw ticketsError
  }

  if (!event) {
    throw new Error(
      'Reservation was confirmed, but ticket email event details were not found.',
    )
  }

  if (!ticketType) {
    throw new Error(
      'Reservation was confirmed, but ticket email ticket type details were not found.',
    )
  }

  const ticketRows = (tickets ?? []) as TicketEmailRow[]

  if (ticketRows.length === 0) {
    throw new Error(
      'Reservation was confirmed, but no issued tickets were found for email delivery.',
    )
  }

  return {
    event,
    reservation,
    ticketType,
    tickets: ticketRows,
  } satisfies TicketEmailDetails
}

async function sendTicketConfirmationEmail(
  details: TicketEmailDetails,
  appUrl: string,
) {
  const resendApiKey = Deno.env.get('RESEND_API_KEY')
  const ticketEmailFrom = Deno.env.get('TICKET_EMAIL_FROM')
  const fromEmail = ticketEmailFrom ?? Deno.env.get('EMAIL_FROM')
  const replyToEmail = Deno.env.get('TICKET_EMAIL_REPLY_TO')
  const buyerEmail = details.reservation.buyer_email?.trim() ?? ''
  const ticketIds = details.tickets.map((ticket) => ticket.id)

  console.log('[stripe-webhook] Resend ticket email preflight:', {
    buyerEmail,
    hasResendApiKey: Boolean(resendApiKey),
    reservationId: details.reservation.id,
    ticketEmailFrom,
    usingFromEmail: fromEmail,
  })

  if (!isValidEmail(buyerEmail)) {
    throw new Error('Ticket email delivery requires a valid buyer email.')
  }

  if (!appUrl) {
    throw new Error('Ticket email delivery requires APP_URL to build ticket links.')
  }

  if (!resendApiKey || !fromEmail) {
    throw new Error(
      'Ticket email delivery is not configured. Set RESEND_API_KEY and TICKET_EMAIL_FROM.',
    )
  }

  const content = buildTicketEmailContent(details, appUrl)

  console.log('[stripe-webhook] attempting Resend ticket email send', {
    buyerEmail,
    reservationId: details.reservation.id,
    ticketIds,
  })

  let response: Response

  try {
    response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        html: content.html,
        subject: `Your ticket for ${details.event.title}`,
        text: content.text,
        to: buyerEmail,
        ...(replyToEmail ? { reply_to: replyToEmail } : {}),
      }),
    })
  } catch (error) {
    console.error('[stripe-webhook] Resend ticket email fetch threw:', {
      buyerEmail,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : typeof error,
      reservationId: details.reservation.id,
    })

    throw error
  }

  const responseText = await response.text()

  console.log('[stripe-webhook] Resend ticket email response:', {
    buyerEmail,
    reservationId: details.reservation.id,
    responseBody: responseText,
    status: response.status,
  })

  if (!response.ok) {
    throw new Error(
      `Ticket email provider failed with ${response.status}: ${
        responseText || response.statusText
      }`,
    )
  }
}

function buildTicketEmailContent(
  details: TicketEmailDetails,
  appUrl: string,
) {
  const eventDate = formatEventDate(details.event.event_date)
  const eventTime = details.event.start_time
    ? formatEventTime(details.event.start_time)
    : 'Time TBA'
  const location = formatEventLocation(details.event)
  const ticketLinks = details.tickets.map((ticket) => ({
    label: `Ticket ${ticket.ticket_number}`,
    url: `${appUrl}/tickets/${ticket.qr_token}`,
  }))

  const textLines = [
    'Payment successful. Your ticket has been emailed to you.',
    '',
    `Event: ${details.event.title}`,
    `Date/time: ${eventDate} at ${eventTime}`,
    `Venue/location: ${location}`,
    `Ticket type: ${details.ticketType.name}`,
    `Ticket quantity: ${details.reservation.quantity}`,
    '',
    'Ticket links:',
    ...ticketLinks.map((ticketLink) => `${ticketLink.label}: ${ticketLink.url}`),
  ]

  const linkItems = ticketLinks
    .map(
      (ticketLink) =>
        `<li><a href="${escapeHtml(ticketLink.url)}">${escapeHtml(
          ticketLink.label,
        )}</a></li>`,
    )
    .join('')

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f6f2eb;color:#15110f;font-family:Arial,sans-serif;">
    <main style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5ded1;border-radius:12px;padding:24px;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#ef2722;">Street Team Ticket</p>
      <h1 style="margin:0 0 16px;font-size:28px;line-height:1.15;">Payment successful</h1>
      <p style="margin:0 0 20px;font-size:16px;">Your ticket has been emailed to you.</p>
      <dl style="margin:0 0 20px;">
        <dt style="font-weight:700;">Event</dt>
        <dd style="margin:0 0 12px;">${escapeHtml(details.event.title)}</dd>
        <dt style="font-weight:700;">Date/time</dt>
        <dd style="margin:0 0 12px;">${escapeHtml(eventDate)} at ${escapeHtml(eventTime)}</dd>
        <dt style="font-weight:700;">Venue/location</dt>
        <dd style="margin:0 0 12px;">${escapeHtml(location)}</dd>
        <dt style="font-weight:700;">Ticket type</dt>
        <dd style="margin:0 0 12px;">${escapeHtml(details.ticketType.name)}</dd>
        <dt style="font-weight:700;">Ticket quantity</dt>
        <dd style="margin:0;">${details.reservation.quantity}</dd>
      </dl>
      <h2 style="margin:0 0 12px;font-size:20px;">Ticket links</h2>
      <ul style="margin:0;padding-left:20px;">${linkItems}</ul>
    </main>
  </body>
</html>`

  return {
    html,
    text: textLines.join('\n'),
  }
}

function formatEventDate(eventDate: string) {
  const [year, month, day] = eventDate.split('-').map(Number)

  if (!year || !month || !day) {
    return eventDate
  }

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

function formatEventTime(eventTime: string) {
  const [hours, minutes] = eventTime.split(':').map(Number)

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return eventTime
  }

  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2000, 0, 1, hours, minutes))
}

function formatEventLocation(event: EventEmailRow) {
  const address = [event.address_line_1, event.address_line_2]
    .map((part) => part?.trim() ?? '')
    .filter(Boolean)
    .join(', ')
  const cityState = [event.city, event.state]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ')

  return [
    event.venue_name,
    address,
    cityState,
    event.postal_code?.trim() ?? '',
    event.country?.trim() ?? '',
  ]
    .filter(Boolean)
    .join(' | ')
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

async function markTicketEmailSent(
  supabase: SupabaseServiceClient,
  reservationId: string,
) {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('ticket_reservations')
    .update({
      ticket_email_error: null,
      ticket_email_last_attempted_at: now,
      ticket_email_sent_at: now,
      updated_at: now,
    })
    .eq('id', reservationId)

  if (error) {
    throw error
  }
}

async function recordTicketEmailError(
  supabase: SupabaseServiceClient,
  reservationId: string,
  message: string,
) {
  const { error } = await supabase
    .from('ticket_reservations')
    .update({
      ticket_email_error: message.slice(0, 2000),
      ticket_email_last_attempted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', reservationId)

  if (error) {
    console.error('[stripe-webhook] failed to record ticket email error:', {
      message: error.message,
      reservationId,
    })
  }
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') {
    return errorResponse('Method not allowed.', 405, 'method_not_allowed')
  }

  let stripeSecretKey: string
  let stripeWebhookSigningSecret: string
  let supabaseUrl: string
  let supabaseServiceRoleKey: string

  try {
    stripeSecretKey = getRequiredEnv('STRIPE_SECRET_KEY')
    stripeWebhookSigningSecret = getRequiredEnv(
      'STRIPE_WEBHOOK_SIGNING_SECRET',
    )
    supabaseUrl = getRequiredEnv('SUPABASE_URL')
    supabaseServiceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY')
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : 'Server configuration is incomplete.'

    console.error('[stripe-webhook] configuration error:', message)
    return errorResponse(message, 500, 'configuration_error')
  }

  const signature = request.headers.get('Stripe-Signature')

  if (!signature) {
    console.error('[stripe-webhook] missing Stripe-Signature header.')
    return errorResponse(
      'Missing Stripe-Signature header.',
      400,
      'missing_stripe_signature',
    )
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2026-02-25.clover',
    httpClient: Stripe.createFetchHttpClient(),
  })
  const cryptoProvider = Stripe.createSubtleCryptoProvider()
  const rawBody = await request.text()
  let stripeEvent: Stripe.Event

  try {
    stripeEvent = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      stripeWebhookSigningSecret,
      undefined,
      cryptoProvider,
    )
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : 'Stripe webhook signature verification failed.'

    console.error('[stripe-webhook] signature verification failed:', message)
    return errorResponse(
      'Stripe webhook signature verification failed.',
      400,
      'invalid_stripe_signature',
    )
  }

  console.log('[stripe-webhook] received event type:', stripeEvent.type)

  if (stripeEvent.type !== 'checkout.session.completed') {
    return jsonResponse({ received: true, ignored: true })
  }

  const session = stripeEvent.data.object as Stripe.Checkout.Session
  const reservationId =
    session.metadata?.reservation_id?.trim() ||
    session.client_reference_id?.trim() ||
    ''

  if (!reservationId) {
    console.error(
      '[stripe-webhook] checkout.session.completed missing reservation id.',
      {
        checkoutSessionId: session.id,
        eventId: stripeEvent.id,
      },
    )

    return jsonResponse({
      received: true,
      fulfilled: false,
      ignored: true,
      reason: 'missing_reservation_id',
    })
  }

  console.log('[stripe-webhook] fulfilling reservation:', reservationId)

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  const paymentIntentId = getPaymentIntentId(session.payment_intent)
  const { error: fulfillmentError } = await supabase.rpc(
    'confirm_paid_ticket_reservation',
    {
      p_checkout_session_id: session.id,
      p_payment_intent_id: paymentIntentId,
      p_reservation_id: reservationId,
    },
  )

  if (fulfillmentError) {
    console.error('[stripe-webhook] fulfillment failed:', {
      checkoutSessionId: session.id,
      message: fulfillmentError.message,
      paymentIntentId,
      reservationId,
    })

    return errorResponse(
      'Paid ticket fulfillment failed.',
      500,
      'fulfillment_failed',
    )
  }

  const appUrl = Deno.env.get('APP_URL')?.replace(/\/$/, '') ?? ''
  let buyerEmailForLog: string | null = session.customer_email ?? null
  let ticketEmailSent = false
  let ticketEmailSkipped = false

  try {
    const emailDetails = await fetchTicketEmailDetails(supabase, reservationId)
    const buyerEmail = emailDetails.reservation.buyer_email?.trim() ?? null
    const ticketIds = emailDetails.tickets.map((ticket) => ticket.id)

    buyerEmailForLog = buyerEmail

    if (emailDetails.reservation.ticket_email_sent_at) {
      ticketEmailSkipped = true
      console.log('[stripe-webhook] ticket email already sent:', {
        buyerEmail,
        reservationId,
        ticketIds,
      })
    } else {
      await sendTicketConfirmationEmail(emailDetails, appUrl)
      await markTicketEmailSent(supabase, reservationId)
      ticketEmailSent = true
      console.log('[stripe-webhook] ticket email sent:', {
        buyerEmail,
        reservationId,
        ticketIds,
        ticketCount: emailDetails.tickets.length,
      })
    }
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : 'Ticket email delivery failed.'

    console.error('[stripe-webhook] ticket email delivery failed:', {
      buyerEmail: buyerEmailForLog,
      checkoutSessionId: session.id,
      message,
      reservationId,
    })

    await recordTicketEmailError(supabase, reservationId, message)
  }

  console.log('[stripe-webhook] fulfillment succeeded:', {
    checkoutSessionId: session.id,
    paymentIntentId,
    reservationId,
  })

  return jsonResponse({
    received: true,
    fulfilled: true,
    ticketEmailSent,
    ticketEmailSkipped,
  })
})
