import { supabase } from '../../lib/supabase'
import {
  fetchPerformersByIds,
  type Performer,
} from '../performers/performers'
import {
  fetchUpcomingPublishedEventsByIds,
  type StreetTeamEvent,
} from './events'

export type EventPerformerRow = {
  id: string
  event_id: string
  performer_id: string
  lineup_role: string | null
  display_order: number | null
  created_at: string
  updated_at: string
}

export type EventLineupEntry = {
  id: string
  eventId: string
  performer: Performer | null
  performerId: string
  lineupRole: string
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export type PerformerOfficialEvent = {
  displayOrder: number
  event: StreetTeamEvent
  lineupId: string
  lineupRole: string
}

type SaveEventLineupInput = {
  displayOrder: string
  lineupRole: string
}

type CreateEventLineupInput = SaveEventLineupInput & {
  eventId: string
  performerId: string
}

const eventLineupSelect =
  'id, event_id, performer_id, lineup_role, display_order, created_at, updated_at'

export async function fetchEventLineup(eventId: string) {
  const { data, error } = await supabase
    .from('event_performers')
    .select(eventLineupSelect)
    .eq('event_id', eventId)
    .order('display_order', { ascending: true })

  if (error) {
    throw error
  }

  return hydrateLineupRows((data ?? []) as EventPerformerRow[])
}

export async function createEventLineupEntry(input: CreateEventLineupInput) {
  const { data, error } = await supabase
    .from('event_performers')
    .insert({
      display_order: parseDisplayOrder(input.displayOrder),
      event_id: input.eventId,
      lineup_role: cleanOptionalText(input.lineupRole),
      performer_id: input.performerId,
    })
    .select(eventLineupSelect)
    .single()

  if (error) {
    throw error
  }

  const [entry] = await hydrateLineupRows([data as EventPerformerRow])

  return entry
}

export async function updateEventLineupEntry(
  eventId: string,
  lineupEntryId: string,
  input: SaveEventLineupInput,
) {
  const { data, error } = await supabase
    .from('event_performers')
    .update({
      display_order: parseDisplayOrder(input.displayOrder),
      lineup_role: cleanOptionalText(input.lineupRole),
    })
    .eq('id', lineupEntryId)
    .eq('event_id', eventId)
    .select(eventLineupSelect)
    .single()

  if (error) {
    throw error
  }

  const [entry] = await hydrateLineupRows([data as EventPerformerRow])

  return entry
}

export async function deleteEventLineupEntry(
  eventId: string,
  lineupEntryId: string,
) {
  const { error } = await supabase
    .from('event_performers')
    .delete()
    .eq('id', lineupEntryId)
    .eq('event_id', eventId)

  if (error) {
    throw error
  }
}

export async function fetchUpcomingPerformerOfficialEvents(
  performerId: string,
) {
  const { data, error } = await supabase
    .from('event_performers')
    .select(eventLineupSelect)
    .eq('performer_id', performerId)
    .order('display_order', { ascending: true })

  if (error) {
    throw error
  }

  const rows = (data ?? []) as EventPerformerRow[]
  const events = await fetchUpcomingPublishedEventsByIds(
    rows.map((row) => row.event_id),
  )
  const eventMap = new Map(events.map((event) => [event.id, event]))

  return rows
    .map((row) => {
      const event = eventMap.get(row.event_id)

      if (!event) {
        return null
      }

      return {
        displayOrder: row.display_order ?? 0,
        event,
        lineupId: row.id,
        lineupRole: row.lineup_role?.trim() ?? '',
      }
    })
    .filter((entry): entry is PerformerOfficialEvent => Boolean(entry))
    .sort((first, second) => {
      const dateCompare = first.event.eventDate.localeCompare(
        second.event.eventDate,
      )

      if (dateCompare !== 0) {
        return dateCompare
      }

      return first.event.title.localeCompare(second.event.title)
    })
}

export function sortEventLineup(entries: EventLineupEntry[]) {
  return [...entries].sort((first, second) => {
    const orderCompare = first.displayOrder - second.displayOrder

    if (orderCompare !== 0) {
      return orderCompare
    }

    return getPerformerName(first).localeCompare(getPerformerName(second))
  })
}

export function isDuplicateLineupPerformerError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false
  }

  const maybeError = error as { code?: string; message?: string }

  return (
    maybeError.code === '23505' ||
    maybeError.message?.toLowerCase().includes('duplicate key') === true ||
    maybeError.message?.toLowerCase().includes('unique') === true
  )
}

async function hydrateLineupRows(rows: EventPerformerRow[]) {
  const performers = await fetchPerformersByIds(
    rows.map((row) => row.performer_id),
  )
  const performerMap = new Map(
    performers.map((performer) => [performer.id, performer]),
  )

  return sortEventLineup(
    rows.map((row) => ({
      createdAt: row.created_at,
      displayOrder: row.display_order ?? 0,
      eventId: row.event_id,
      id: row.id,
      lineupRole: row.lineup_role?.trim() ?? '',
      performer: performerMap.get(row.performer_id) ?? null,
      performerId: row.performer_id,
      updatedAt: row.updated_at,
    })),
  )
}

function getPerformerName(entry: EventLineupEntry) {
  return entry.performer?.name ?? ''
}

function parseDisplayOrder(value: string) {
  const parsedValue = Number.parseInt(value, 10)

  return Number.isNaN(parsedValue) ? 0 : parsedValue
}

function cleanOptionalText(value: string) {
  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : null
}
