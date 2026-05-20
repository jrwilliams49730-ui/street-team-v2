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

export type ClaimFreeTicketInput = {
  buyerEmail: string
  buyerName: string
  quantity: number
  ticketTypeId: string
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
  'id, event_id, ticket_type_id, purchaser_user_id, buyer_name, buyer_email, quantity, reservation_status, ticket_kind_snapshot, unit_price_cents_snapshot, total_price_cents_snapshot, created_at, updated_at'

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

function cleanOptionalText(value: string) {
  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : null
}

function cleanRequiredText(value: string) {
  return value.trim()
}
