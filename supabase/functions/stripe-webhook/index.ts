import Stripe from 'npm:stripe@19.2.0'
import { createClient } from 'npm:@supabase/supabase-js@2'

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
    const message = error instanceof Error ? error.message : 'Server configuration is incomplete.'
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
    const message = error instanceof Error ? error.message : 'Stripe webhook signature verification failed.'
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
      persistSession: false,
      autoRefreshToken: false,
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

  console.log('[stripe-webhook] fulfillment succeeded:', {
    checkoutSessionId: session.id,
    paymentIntentId,
    reservationId,
  })

  return jsonResponse({
    received: true,
    fulfilled: true,
  })
})
