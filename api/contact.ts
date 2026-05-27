import type { IncomingMessage, ServerResponse } from 'node:http'
import { createClient } from '@supabase/supabase-js'

const allowedInterestTypes = [
  'Supporting the launch',
  'Founding investor conversation',
  'Sponsorship',
  'Venue / event organizer',
  'Performer / creator',
  'Other',
] as const

type InterestType = (typeof allowedInterestTypes)[number]

type ContactPayload = {
  email: string
  interest: InterestType
  message: string
  name: string
  phone: string
}

type ApiRequest = IncomingMessage & {
  body?: unknown
  method?: string
}

type JsonPayload = {
  error?: string
  ok: boolean
}

const maxBodyLength = 10_000
const maxMessageLength = 2_000
const publicErrorMessage = 'Something went wrong. Please try again.'

function sendJson(
  response: ServerResponse,
  statusCode: number,
  payload: JsonPayload,
) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(payload))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readBody(request: ApiRequest) {
  if (request.body !== undefined) {
    if (typeof request.body === 'string') {
      return Promise.resolve(JSON.parse(request.body))
    }

    return Promise.resolve(request.body)
  }

  return new Promise<unknown>((resolve, reject) => {
    let body = ''
    let isSettled = false

    request.on('data', (chunk: Buffer) => {
      body += chunk.toString('utf8')

      if (body.length > maxBodyLength && !isSettled) {
        isSettled = true
        reject(new Error('Request body is too large.'))
        request.destroy()
      }
    })

    request.on('end', () => {
      if (isSettled) {
        return
      }

      if (!body) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(body))
      } catch {
        reject(new Error('Request body must be valid JSON.'))
      }
    })

    request.on('error', reject)
  })
}

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function isAllowedInterestType(value: string): value is InterestType {
  return allowedInterestTypes.includes(value as InterestType)
}

function validatePayload(body: unknown): ContactPayload | string {
  if (!isRecord(body)) {
    return 'Request body must be a JSON object.'
  }

  const name = cleanString(body.name).slice(0, 120)
  const email = cleanString(body.email).slice(0, 160)
  const phone = cleanString(body.phone).slice(0, 80)
  const interest = cleanString(
    body.interest ?? body.interestType ?? body.interest_type,
  )
  const message = cleanString(body.message)

  if (!name || !email || !interest || !message) {
    return 'Name, email, interest, and message are required.'
  }

  if (!isValidEmail(email)) {
    return 'Please provide a valid email address.'
  }

  if (!isAllowedInterestType(interest)) {
    return 'Please choose a valid interest.'
  }

  if (message.length > maxMessageLength) {
    return `Message must be ${maxMessageLength} characters or fewer.`
  }

  return {
    email,
    interest,
    message,
    name,
    phone,
  }
}

export default async function handler(
  request: ApiRequest,
  response: ServerResponse,
) {
  console.log('Contact API hit')

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    sendJson(response, 405, { ok: false, error: 'Method not allowed.' })
    return
  }

  const supabaseUrl =
    process.env.SUPABASE_URL?.trim() ?? process.env.VITE_SUPABASE_URL?.trim()
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Contact submission insert failed', {
      hasSupabaseServiceRoleKey: Boolean(supabaseServiceRoleKey),
      hasSupabaseUrl: Boolean(supabaseUrl),
      reason: 'missing_supabase_configuration',
    })
    sendJson(response, 500, { ok: false, error: publicErrorMessage })
    return
  }

  let payload: ContactPayload

  try {
    const body = await readBody(request)
    const validationResult = validatePayload(body)

    if (typeof validationResult === 'string') {
      sendJson(response, 400, { ok: false, error: publicErrorMessage })
      return
    }

    payload = validationResult
  } catch (error) {
    console.error('Contact submission request failed', error)
    sendJson(response, 400, { ok: false, error: publicErrorMessage })
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const { data, error } = await supabase
    .from('contact_submissions')
    .insert({
      email: payload.email,
      interest_type: payload.interest,
      message: payload.message,
      name: payload.name,
      phone: payload.phone || null,
      source: 'street_team_landing_page',
      status: 'new',
    })
    .select('id')
    .single()

  if (error || !data?.id) {
    console.error('Contact submission insert failed', {
      error,
      payload: {
        email: payload.email,
        hasPhone: Boolean(payload.phone),
        interest: payload.interest,
        messageLength: payload.message.length,
        name: payload.name,
      },
    })
    sendJson(response, 500, { ok: false, error: publicErrorMessage })
    return
  }

  console.log('Contact submission saved', { id: data.id })
  sendJson(response, 200, { ok: true })
}
