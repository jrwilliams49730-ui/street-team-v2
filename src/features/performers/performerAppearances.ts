import { supabase } from '../../lib/supabase'

export type PerformerAppearanceRow = {
  id: string
  performer_id: string
  owner_user_id: string
  title: string | null
  venue_name: string
  venue_city: string | null
  venue_state: string | null
  appearance_date: string
  appearance_time: string | null
  ticket_url: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type PerformerAppearance = {
  id: string
  performerId: string
  ownerUserId: string
  title: string
  venueName: string
  venueCity: string
  venueState: string
  appearanceDate: string
  appearanceTime: string
  ticketUrl: string
  notes: string
  createdAt: string
  updatedAt: string
}

export type SavePerformerAppearanceInput = {
  appearanceDate: string
  appearanceTime: string
  notes: string
  ticketUrl: string
  title: string
  venueCity: string
  venueName: string
  venueState: string
}

export type CreatePerformerAppearanceInput = SavePerformerAppearanceInput & {
  ownerUserId: string
  performerId: string
}

const performerAppearanceSelect =
  'id, performer_id, owner_user_id, title, venue_name, venue_city, venue_state, appearance_date, appearance_time, ticket_url, notes, created_at, updated_at'

export async function fetchUpcomingPerformerAppearances(performerId: string) {
  const { data, error } = await supabase
    .from('performer_appearances')
    .select(performerAppearanceSelect)
    .eq('performer_id', performerId)
    .gte('appearance_date', getTodayDateString())
    .order('appearance_date', { ascending: true })
    .order('appearance_time', { ascending: true, nullsFirst: false })

  if (error) {
    throw error
  }

  return sortPerformerAppearances(
    ((data ?? []) as PerformerAppearanceRow[]).map(mapPerformerAppearanceRow),
  )
}

export async function createPerformerAppearance(
  input: CreatePerformerAppearanceInput,
) {
  const { data, error } = await supabase
    .from('performer_appearances')
    .insert({
      appearance_date: cleanRequiredText(input.appearanceDate),
      appearance_time: cleanOptionalText(input.appearanceTime),
      notes: cleanOptionalText(input.notes),
      owner_user_id: input.ownerUserId,
      performer_id: input.performerId,
      ticket_url: normalizeTicketUrl(input.ticketUrl),
      title: cleanOptionalText(input.title),
      venue_city: cleanOptionalText(input.venueCity),
      venue_name: cleanRequiredText(input.venueName),
      venue_state: cleanOptionalText(input.venueState),
    })
    .select(performerAppearanceSelect)
    .single()

  if (error) {
    throw error
  }

  return mapPerformerAppearanceRow(data as PerformerAppearanceRow)
}

export async function updatePerformerAppearance(
  ownerUserId: string,
  appearanceId: string,
  input: SavePerformerAppearanceInput,
) {
  const { data, error } = await supabase
    .from('performer_appearances')
    .update({
      appearance_date: cleanRequiredText(input.appearanceDate),
      appearance_time: cleanOptionalText(input.appearanceTime),
      notes: cleanOptionalText(input.notes),
      ticket_url: normalizeTicketUrl(input.ticketUrl),
      title: cleanOptionalText(input.title),
      venue_city: cleanOptionalText(input.venueCity),
      venue_name: cleanRequiredText(input.venueName),
      venue_state: cleanOptionalText(input.venueState),
    })
    .eq('id', appearanceId)
    .eq('owner_user_id', ownerUserId)
    .select(performerAppearanceSelect)
    .single()

  if (error) {
    throw error
  }

  return mapPerformerAppearanceRow(data as PerformerAppearanceRow)
}

export async function deletePerformerAppearance(
  ownerUserId: string,
  appearanceId: string,
) {
  const { error } = await supabase
    .from('performer_appearances')
    .delete()
    .eq('id', appearanceId)
    .eq('owner_user_id', ownerUserId)

  if (error) {
    throw error
  }
}

export function sortPerformerAppearances(
  appearances: PerformerAppearance[],
) {
  return [...appearances].sort((first, second) => {
    const dateCompare = first.appearanceDate.localeCompare(
      second.appearanceDate,
    )

    if (dateCompare !== 0) {
      return dateCompare
    }

    return getSortableAppearanceTime(first.appearanceTime).localeCompare(
      getSortableAppearanceTime(second.appearanceTime),
    )
  })
}

export function isUpcomingAppearance(appearance: PerformerAppearance) {
  return appearance.appearanceDate >= getTodayDateString()
}

export function formatAppearanceDate(appearanceDate: string) {
  const [year, month, day] = appearanceDate.split('-').map(Number)

  if (!year || !month || !day) {
    return appearanceDate
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

export function formatAppearanceTime(appearanceTime: string) {
  const [hours, minutes] = appearanceTime.split(':').map(Number)

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return appearanceTime
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2000, 0, 1, hours, minutes))
}

export function formatAppearanceLocation(appearance: PerformerAppearance) {
  return [appearance.venueCity, appearance.venueState]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ')
}

export function getSafeTicketUrl(ticketUrl: string) {
  if (!ticketUrl.trim()) {
    return null
  }

  try {
    const url = new URL(ticketUrl)

    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.href
      : null
  } catch {
    return null
  }
}

function mapPerformerAppearanceRow(
  row: PerformerAppearanceRow,
): PerformerAppearance {
  return {
    appearanceDate: row.appearance_date,
    appearanceTime: row.appearance_time ?? '',
    createdAt: row.created_at,
    id: row.id,
    notes: row.notes?.trim() ?? '',
    ownerUserId: row.owner_user_id,
    performerId: row.performer_id,
    ticketUrl: row.ticket_url?.trim() ?? '',
    title: row.title?.trim() ?? '',
    updatedAt: row.updated_at,
    venueCity: row.venue_city?.trim() ?? '',
    venueName: row.venue_name,
    venueState: row.venue_state?.trim() ?? '',
  }
}

function normalizeTicketUrl(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  const hasProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed)
  const candidate = hasProtocol ? trimmed : `https://${trimmed}`

  try {
    const url = new URL(candidate)

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('Ticket link must use http:// or https://.')
    }

    return url.href
  } catch {
    throw new Error(
      'Enter a valid external ticket link, like https://tickets.example.com.',
    )
  }
}

export function getTodayDateString() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getSortableAppearanceTime(appearanceTime: string) {
  return appearanceTime || '99:99:99'
}

function cleanOptionalText(value: string) {
  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : null
}

function cleanRequiredText(value: string) {
  return value.trim()
}
