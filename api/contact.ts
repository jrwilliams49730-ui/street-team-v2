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
  interestType: InterestType
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
  ok?: boolean
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
  const interestType = cleanString(body.interestType)
  const message = cleanString(body.message)

  if (!name || !email || !interestType || !message) {
    return 'Name, email, interest type, and message are required.'
  }

  if (!isValidEmail(email)) {
    return 'Please provide a valid email address.'
  }

  if (!isAllowedInterestType(interestType)) {
    return 'Please choose a valid interest type.'
  }

  if (message.length > maxMessageLength) {
    return `Message must be ${maxMessageLength} characters or fewer.`
  }

  return {
    email,
    interestType,
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
    `Interest type: ${payload.interestType}`,
    '',
    'Message:',
    payload.message,
  ].join('\n')
}

export default async function handler(
  request: ApiRequest,
  response: ServerResponse,
) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    sendJson(response, 405, { error: 'Method not allowed.' })
    return
  }

  const apiKey = process.env.RESEND_API_KEY
  const toEmail = process.env.CONTACT_TO_EMAIL
  const fromEmail = process.env.CONTACT_FROM_EMAIL

  if (!apiKey || !toEmail || !fromEmail) {
    sendJson(response, 500, { error: 'Contact email is not configured.' })
    return
  }

  try {
    const body = await readBody(request)
    const payload = validatePayload(body)

    if (typeof payload === 'string') {
      sendJson(response, 400, { error: payload })
      return
    }

    const resend = new Resend(apiKey)

    await resend.emails.send({
      from: fromEmail,
      replyTo: payload.email,
      subject: `New Street Team Landing Page Inquiry - ${payload.interestType}`,
      text: buildEmailBody(payload),
      to: toEmail,
    })

    sendJson(response, 200, { ok: true })
  } catch {
    sendJson(response, 500, { error: 'Something went wrong. Please try again.' })
  }
}
