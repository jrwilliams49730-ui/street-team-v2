import { supabase } from '../../lib/supabase'

export type TicketKind = 'free' | 'paid'

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

export function formatTicketPrice(priceCents: number) {
  return new Intl.NumberFormat(undefined, {
    currency: 'USD',
    style: 'currency',
  }).format(priceCents / 100)
}

export function formatTicketKind(ticketKind: TicketKind) {
  return ticketKind === 'free' ? 'Free' : 'Paid'
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

function normalizeTicketKind(value: string): TicketKind {
  return value === 'paid' ? 'paid' : 'free'
}

function cleanOptionalText(value: string) {
  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : null
}

function cleanRequiredText(value: string) {
  return value.trim()
}
