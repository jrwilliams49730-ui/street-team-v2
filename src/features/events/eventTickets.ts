import { publicSupabase, supabase } from '../../lib/supabase'

export type TicketKind = 'free' | 'paid'
export type TicketReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'expired'
export type IndividualTicketStatus = 'issued' | 'checked_in' | 'void'
export type TicketCheckInOutcome =
  | 'checked_in'
  | 'already_checked_in'
  | 'void'
  | 'invalid'
  | 'forbidden'

export type EventTicketTypeRow = {
  id: string
  event_id: string
  name: string
  description: string | null
  ticket_kind: string
  price_cents: number
  quantity_total: number
  created_at: string
  updated_at: string
}

export type EventTicketType = {
  id: string
  eventId: string
  name: string
  description: string
  ticketKind: TicketKind
  priceCents: number
  quantityTotal: number
  createdAt: string
  updatedAt: string
}

export type TicketReservation = {
  id: string
  eventId: string
  ticketTypeId: string
  purchaserUserId: string | null
  buyerName: string
  buyerEmail: string
  quantity: number
  reservationStatus: TicketReservationStatus
  ticketKindSnapshot: TicketKind
  ticketEmailError: string
  ticketEmailLastAttemptedAt: string | null
  ticketEmailSentAt: string | null
  unitPriceCentsSnapshot: number
  totalPriceCentsSnapshot: number
  createdAt: string
  updatedAt: string
}

export type IndividualTicket = {
  id: string
  reservationId: string
  eventId: string
  ticketTypeId: string
  ticketNumber: number
  ticketStatus: IndividualTicketStatus
  qrToken: string
  checkedInAt: string | null
  createdAt: string
  updatedAt: string
}

export type TicketCheckInResult = {
  outcome: TicketCheckInOutcome
  message: string
  ticketId: string | null
  ticketNumber: number | null
  ticketStatus: IndividualTicketStatus | null
  checkedInAt: string | null
  eventTitle: string | null
  ticketTypeName: string | null
  buyerName: string | null
  buyerEmail: string | null
}

export type PublicTicket = {
  addressLine1: string
  addressLine2: string
  buyerEmail: string
  buyerName: string
  city: string
  country: string
  eventDate: string
  eventId: string
  eventSlug: string
  eventTimezone: string
  eventTitle: string
  postalCode: string
  qrToken: string
  quantity: number
  reservationId: string
  startTime: string
  state: string
  ticketId: string
  ticketNumber: number
  ticketStatus: IndividualTicketStatus
  ticketTypeId: string
  ticketTypeName: string
  venueName: string
}

export type EventTicketCheckInSummary = {
  totalTickets: number
  checkedInTickets: number
  notCheckedInTickets: number
  voidTickets: number
}

export type EventCheckInTicket = {
  buyerEmail: string
  buyerName: string
  checkedInAt: string | null
  qrToken: string
  reservationId: string
  ticketEmailError: string
  ticketEmailLastAttemptedAt: string | null
  ticketEmailSentAt: string | null
  ticketId: string
  ticketNumber: number
  ticketStatus: IndividualTicketStatus
  ticketTypeName: string
}

export type TicketReservationRow = {
  id: string
  event_id: string
  ticket_type_id: string
  purchaser_user_id: string | null
  buyer_name: string
  buyer_email: string
  quantity: number
  reservation_status: string
  ticket_kind_snapshot: string
  ticket_email_error: string | null
  ticket_email_last_attempted_at: string | null
  ticket_email_sent_at: string | null
  unit_price_cents_snapshot: number
  total_price_cents_snapshot: number
  created_at: string
  updated_at: string
}

export type IndividualTicketRow = {
  id: string
  reservation_id: string
  event_id: string
  ticket_type_id: string
  ticket_number: number
  ticket_status: string
  qr_token: string
  checked_in_at: string | null
  created_at: string
  updated_at: string
}

export type TicketCheckInResultRow = {
  outcome: string
  message: string
  ticket_id: string | null
  ticket_number: number | null
  ticket_status: string | null
  checked_in_at: string | null
  event_title: string | null
  ticket_type_name: string | null
  buyer_name: string | null
  buyer_email: string | null
}

export type PublicTicketRow = {
  address_line_1: string | null
  address_line_2: string | null
  buyer_email: string
  buyer_name: string
  city: string
  country: string | null
  event_date: string
  event_id: string
  event_slug: string
  event_timezone: string | null
  event_title: string
  postal_code: string | null
  qr_token: string
  quantity: number
  reservation_id: string
  start_time: string | null
  state: string
  ticket_id: string
  ticket_number: number
  ticket_status: string
  ticket_type_id: string
  ticket_type_name: string
  venue_name: string
}

export type ClaimFreeTicketInput = {
  buyerEmail: string
  buyerName: string
  quantity: number
  ticketTypeId: string
}

export type CreatePaidTicketReservationInput = ClaimFreeTicketInput

export type CreateCheckoutSessionResponse = {
  sessionId: string
  url: string
}

export type SaveEventTicketTypeInput = {
  description: string
  name: string
  priceCents: number
  quantityTotal: number
  ticketKind: TicketKind
}

export type CreateEventTicketTypeInput = SaveEventTicketTypeInput & {
  eventId: string
}

const eventTicketTypeSelect =
  'id, event_id, name, description, ticket_kind, price_cents, quantity_total, created_at, updated_at'

const ticketReservationSelect =
  'id, event_id, ticket_type_id, purchaser_user_id, buyer_name, buyer_email, quantity, reservation_status, ticket_kind_snapshot, ticket_email_error, ticket_email_last_attempted_at, ticket_email_sent_at, unit_price_cents_snapshot, total_price_cents_snapshot, created_at, updated_at'

const individualTicketSelect =
  'id, reservation_id, event_id, ticket_type_id, ticket_number, ticket_status, qr_token, checked_in_at, created_at, updated_at'

export async function fetchEventTicketTypes(eventId: string) {
  const { data, error } = await supabase
    .from('event_ticket_types')
    .select(eventTicketTypeSelect)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return ((data ?? []) as EventTicketTypeRow[]).map(mapTicketTypeRow)
}

export async function fetchPublicEventTicketTypes(eventId: string) {
  const { data, error } = await publicSupabase
    .from('event_ticket_types')
    .select(eventTicketTypeSelect)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return ((data ?? []) as EventTicketTypeRow[]).map(mapTicketTypeRow)
}

export async function fetchEventTicketTypesByIds(ticketTypeIds: string[]) {
  const uniqueTicketTypeIds = [...new Set(ticketTypeIds)]

  if (uniqueTicketTypeIds.length === 0) {
    return []
  }

  const { data, error } = await publicSupabase
    .from('event_ticket_types')
    .select(eventTicketTypeSelect)
    .in('id', uniqueTicketTypeIds)
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return ((data ?? []) as EventTicketTypeRow[]).map(mapTicketTypeRow)
}

export async function createEventTicketType(
  input: CreateEventTicketTypeInput,
) {
  const { data, error } = await supabase
    .from('event_ticket_types')
    .insert({
      description: cleanOptionalText(input.description),
      event_id: input.eventId,
      name: cleanRequiredText(input.name),
      price_cents: input.priceCents,
      quantity_total: input.quantityTotal,
      ticket_kind: input.ticketKind,
    })
    .select(eventTicketTypeSelect)
    .single()

  if (error) {
    throw error
  }

  return mapTicketTypeRow(data as EventTicketTypeRow)
}

export async function updateEventTicketType(
  eventId: string,
  ticketTypeId: string,
  input: SaveEventTicketTypeInput,
) {
  const { data, error } = await supabase
    .from('event_ticket_types')
    .update({
      description: cleanOptionalText(input.description),
      name: cleanRequiredText(input.name),
      price_cents: input.priceCents,
      quantity_total: input.quantityTotal,
      ticket_kind: input.ticketKind,
    })
    .eq('id', ticketTypeId)
    .eq('event_id', eventId)
    .select(eventTicketTypeSelect)
    .single()

  if (error) {
    throw error
  }

  return mapTicketTypeRow(data as EventTicketTypeRow)
}

export async function deleteEventTicketType(
  eventId: string,
  ticketTypeId: string,
) {
  const { error } = await supabase
    .from('event_ticket_types')
    .delete()
    .eq('id', ticketTypeId)
    .eq('event_id', eventId)

  if (error) {
    throw error
  }
}

export async function claimFreeTicket(input: ClaimFreeTicketInput) {
  const { data, error } = await supabase.rpc('claim_free_ticket', {
    p_buyer_email: input.buyerEmail,
    p_buyer_name: input.buyerName,
    p_quantity: input.quantity,
    p_ticket_type_id: input.ticketTypeId,
  })

  if (error) {
    throw error
  }

  return data as TicketReservationRow
}

export async function createPaidTicketReservation(
  input: CreatePaidTicketReservationInput,
) {
  const { data, error } = await supabase.rpc('create_paid_ticket_reservation', {
    p_buyer_email: input.buyerEmail,
    p_buyer_name: input.buyerName,
    p_quantity: input.quantity,
    p_ticket_type_id: input.ticketTypeId,
  })

  if (error) {
    throw error
  }

  return mapTicketReservationRow(data as TicketReservationRow)
}

export async function createCheckoutSessionForReservation(
  reservationId: string,
) {
  const { data, error } =
    await supabase.functions.invoke<CreateCheckoutSessionResponse>(
      'create-checkout-session',
      {
        body: {
          reservationId,
        },
      },
    )

  if (error) {
    throw new Error(
      (await getFunctionErrorMessage(error)) ??
        'We could not start checkout. Please try again.',
    )
  }

  if (!data?.url) {
    throw new Error('We could not start checkout. Please try again.')
  }

  return data
}

export async function fetchTicketReservationsForUser(userId: string) {
  const { data, error } = await supabase
    .from('ticket_reservations')
    .select(ticketReservationSelect)
    .eq('purchaser_user_id', userId)
    .in('reservation_status', ['confirmed', 'pending'])
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return ((data ?? []) as TicketReservationRow[]).map(mapTicketReservationRow)
}

export async function fetchIndividualTicketsForReservation(
  reservationId: string,
) {
  const { data, error } = await supabase
    .from('tickets')
    .select(individualTicketSelect)
    .eq('reservation_id', reservationId)
    .order('ticket_number', { ascending: true })

  if (error) {
    throw error
  }

  return ((data ?? []) as IndividualTicketRow[]).map(mapIndividualTicketRow)
}

export async function fetchPublicTicketByQrToken(qrToken: string) {
  const { data, error } = await publicSupabase.rpc(
    'get_public_ticket_by_qr_token',
    {
      p_qr_token: qrToken,
    },
  )

  if (error) {
    throw error
  }

  const resultRows = Array.isArray(data)
    ? (data as PublicTicketRow[])
    : data
      ? [data as PublicTicketRow]
      : []

  return resultRows[0] ? mapPublicTicketRow(resultRows[0]) : null
}

export async function fetchEventTicketCheckInSummary(eventId: string) {
  const { data, error } = await supabase
    .from('tickets')
    .select('ticket_status')
    .eq('event_id', eventId)

  if (error) {
    throw error
  }

  return ((data ?? []) as Pick<IndividualTicketRow, 'ticket_status'>[]).reduce(
    (summary, row) => {
      const ticketStatus = normalizeIndividualTicketStatus(row.ticket_status)

      if (ticketStatus === 'checked_in') {
        summary.checkedInTickets += 1
      } else if (ticketStatus === 'void') {
        summary.voidTickets += 1
      } else {
        summary.notCheckedInTickets += 1
      }

      summary.totalTickets += 1

      return summary
    },
    {
      checkedInTickets: 0,
      notCheckedInTickets: 0,
      totalTickets: 0,
      voidTickets: 0,
    } satisfies EventTicketCheckInSummary,
  )
}

export async function fetchEventCheckInTickets(eventId: string) {
  const { data, error } = await supabase
    .from('tickets')
    .select(individualTicketSelect)
    .eq('event_id', eventId)
    .order('created_at', { ascending: true })
    .order('ticket_number', { ascending: true })

  if (error) {
    throw error
  }

  const tickets = ((data ?? []) as IndividualTicketRow[]).map(
    mapIndividualTicketRow,
  )

  if (tickets.length === 0) {
    return []
  }

  const [reservations, ticketTypes] = await Promise.all([
    fetchTicketReservationsByIds(
      tickets.map((ticket) => ticket.reservationId),
    ),
    fetchEventTicketTypesByIds(
      tickets.map((ticket) => ticket.ticketTypeId),
    ),
  ])
  const reservationsById = new Map(
    reservations.map((reservation) => [reservation.id, reservation]),
  )
  const ticketTypesById = new Map(
    ticketTypes.map((ticketType) => [ticketType.id, ticketType]),
  )

  return tickets.map((ticket) => {
    const reservation = reservationsById.get(ticket.reservationId)
    const ticketType = ticketTypesById.get(ticket.ticketTypeId)

    return {
      buyerEmail: reservation?.buyerEmail ?? '',
      buyerName: reservation?.buyerName ?? 'Unknown buyer',
      checkedInAt: ticket.checkedInAt,
      qrToken: ticket.qrToken,
      reservationId: ticket.reservationId,
      ticketEmailError: reservation?.ticketEmailError ?? '',
      ticketEmailLastAttemptedAt: reservation?.ticketEmailLastAttemptedAt ?? null,
      ticketEmailSentAt: reservation?.ticketEmailSentAt ?? null,
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      ticketStatus: ticket.ticketStatus,
      ticketTypeName: ticketType?.name ?? 'Ticket type unavailable',
    }
  })
}

export async function checkInTicketByQr(qrValue: string) {
  const { data, error } = await supabase.rpc('check_in_ticket_by_qr', {
    p_qr_value: qrValue,
  })

  if (error) {
    throw error
  }

  const resultRows = Array.isArray(data)
    ? (data as TicketCheckInResultRow[])
    : data
      ? [data as TicketCheckInResultRow]
      : []

  return mapTicketCheckInResultRow(
    resultRows[0] ?? {
      buyer_email: null,
      buyer_name: null,
      checked_in_at: null,
      event_title: null,
      message: 'Ticket check-in did not return a result.',
      outcome: 'invalid',
      ticket_id: null,
      ticket_number: null,
      ticket_status: null,
      ticket_type_name: null,
    },
  )
}

async function fetchTicketReservationsByIds(reservationIds: string[]) {
  const uniqueReservationIds = [...new Set(reservationIds)]

  if (uniqueReservationIds.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from('ticket_reservations')
    .select(ticketReservationSelect)
    .in('id', uniqueReservationIds)

  if (error) {
    throw error
  }

  return ((data ?? []) as TicketReservationRow[]).map(mapTicketReservationRow)
}

export function formatTicketPrice(priceCents: number) {
  return new Intl.NumberFormat(undefined, {
    currency: 'USD',
    style: 'currency',
  }).format(priceCents / 100)
}

export function formatTicketKind(ticketKind: TicketKind) {
  return ticketKind === 'free' ? 'Free' : 'Paid'
}

export function formatReservationStatus(status: TicketReservationStatus) {
  if (status === 'pending') {
    return 'Pending'
  }

  if (status === 'cancelled') {
    return 'Cancelled'
  }

  if (status === 'expired') {
    return 'Expired'
  }

  return 'Confirmed'
}

export function formatIndividualTicketStatus(status: IndividualTicketStatus) {
  if (status === 'checked_in') {
    return 'Checked In'
  }

  if (status === 'void') {
    return 'Void'
  }

  return 'Issued'
}

function mapTicketTypeRow(row: EventTicketTypeRow): EventTicketType {
  return {
    createdAt: row.created_at,
    description: row.description?.trim() ?? '',
    eventId: row.event_id,
    id: row.id,
    name: row.name,
    priceCents: row.price_cents,
    quantityTotal: row.quantity_total,
    ticketKind: normalizeTicketKind(row.ticket_kind),
    updatedAt: row.updated_at,
  }
}

function mapTicketReservationRow(row: TicketReservationRow): TicketReservation {
  return {
    buyerEmail: row.buyer_email,
    buyerName: row.buyer_name,
    createdAt: row.created_at,
    eventId: row.event_id,
    id: row.id,
    purchaserUserId: row.purchaser_user_id,
    quantity: row.quantity,
    reservationStatus: normalizeReservationStatus(row.reservation_status),
    ticketEmailError: row.ticket_email_error?.trim() ?? '',
    ticketEmailLastAttemptedAt: row.ticket_email_last_attempted_at,
    ticketEmailSentAt: row.ticket_email_sent_at,
    ticketKindSnapshot: normalizeTicketKind(row.ticket_kind_snapshot),
    ticketTypeId: row.ticket_type_id,
    totalPriceCentsSnapshot: row.total_price_cents_snapshot,
    unitPriceCentsSnapshot: row.unit_price_cents_snapshot,
    updatedAt: row.updated_at,
  }
}

function mapIndividualTicketRow(row: IndividualTicketRow): IndividualTicket {
  return {
    checkedInAt: row.checked_in_at,
    createdAt: row.created_at,
    eventId: row.event_id,
    id: row.id,
    qrToken: row.qr_token,
    reservationId: row.reservation_id,
    ticketNumber: row.ticket_number,
    ticketStatus: normalizeIndividualTicketStatus(row.ticket_status),
    ticketTypeId: row.ticket_type_id,
    updatedAt: row.updated_at,
  }
}

function mapTicketCheckInResultRow(
  row: TicketCheckInResultRow,
): TicketCheckInResult {
  return {
    buyerEmail: row.buyer_email,
    buyerName: row.buyer_name,
    checkedInAt: row.checked_in_at,
    eventTitle: row.event_title,
    message: row.message,
    outcome: normalizeTicketCheckInOutcome(row.outcome),
    ticketId: row.ticket_id,
    ticketNumber: row.ticket_number,
    ticketStatus: row.ticket_status
      ? normalizeIndividualTicketStatus(row.ticket_status)
      : null,
    ticketTypeName: row.ticket_type_name,
  }
}

function mapPublicTicketRow(row: PublicTicketRow): PublicTicket {
  return {
    addressLine1: row.address_line_1?.trim() ?? '',
    addressLine2: row.address_line_2?.trim() ?? '',
    buyerEmail: row.buyer_email,
    buyerName: row.buyer_name,
    city: row.city,
    country: row.country?.trim() ?? '',
    eventDate: row.event_date,
    eventId: row.event_id,
    eventSlug: row.event_slug,
    eventTimezone: row.event_timezone?.trim() ?? '',
    eventTitle: row.event_title,
    postalCode: row.postal_code?.trim() ?? '',
    qrToken: row.qr_token,
    quantity: row.quantity,
    reservationId: row.reservation_id,
    startTime: row.start_time ?? '',
    state: row.state,
    ticketId: row.ticket_id,
    ticketNumber: row.ticket_number,
    ticketStatus: normalizeIndividualTicketStatus(row.ticket_status),
    ticketTypeId: row.ticket_type_id,
    ticketTypeName: row.ticket_type_name,
    venueName: row.venue_name,
  }
}

function normalizeTicketKind(value: string): TicketKind {
  return value === 'paid' ? 'paid' : 'free'
}

function normalizeReservationStatus(value: string): TicketReservationStatus {
  if (value === 'pending' || value === 'cancelled' || value === 'expired') {
    return value
  }

  return 'confirmed'
}

function normalizeIndividualTicketStatus(value: string): IndividualTicketStatus {
  if (value === 'checked_in' || value === 'void') {
    return value
  }

  return 'issued'
}

function normalizeTicketCheckInOutcome(value: string): TicketCheckInOutcome {
  if (
    value === 'checked_in' ||
    value === 'already_checked_in' ||
    value === 'void' ||
    value === 'forbidden'
  ) {
    return value
  }

  return 'invalid'
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

function cleanOptionalText(value: string) {
  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : null
}

function cleanRequiredText(value: string) {
  return value.trim()
}
