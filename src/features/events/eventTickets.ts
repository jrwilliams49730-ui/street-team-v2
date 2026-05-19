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
