import type { IncomingMessage, ServerResponse } from 'node:http'
import { Resend } from 'resend'

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
  const interest = cleanString(body.interest ?? body.interestType)
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

function buildEmailBody(payload: ContactPayload) {
  return [
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Phone: ${payload.phone || 'Not provided'}`,
    `Interest: ${payload.interest}`,
    '',
    'Message:',
    payload.message,
  ].join('\n')
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

  const apiKey = process.env.RESEND_API_KEY?.trim()
  const toEmail = process.env.CONTACT_TO_EMAIL?.trim()
  const fromEmail = process.env.CONTACT_FROM_EMAIL?.trim()

  if (!apiKey || !toEmail || !fromEmail) {
    sendJson(response, 500, {
      ok: false,
      error: 'Contact email is not configured.',
    })
    return
  }

  let payload: ContactPayload

  try {
    const body = await readBody(request)
    const validationResult = validatePayload(body)

    if (typeof validationResult === 'string') {
      sendJson(response, 400, { ok: false, error: validationResult })
      return
    }

    payload = validationResult
  } catch (error) {
    sendJson(response, 400, {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Request body could not be read.',
    })
    return
  }

  try {
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from: `Street Team <${fromEmail}>`,
      replyTo: payload.email,
      subject: `New Street Team Landing Page Inquiry - ${payload.interest}`,
      text: buildEmailBody(payload),
      to: toEmail,
    })

    if (error || !data?.id) {
      console.error('Contact email failed', error ?? data)
      sendJson(response, 502, {
        ok: false,
        error: getResendErrorMessage(error) ?? 'Contact email failed to send.',
      })
      return
    }

    console.log('Contact email sent', data)
    sendJson(response, 200, { ok: true })
  } catch (error) {
    console.error('Contact email failed', error)
    sendJson(response, 500, {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : 'Contact email failed to send.',
    })
  }
}

function getResendErrorMessage(error: unknown) {
  if (!error || typeof error !== 'object') {
    return null
  }

  if ('message' in error && typeof error.message === 'string') {
    return error.message
  }

  return null
}
