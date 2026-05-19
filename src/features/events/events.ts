import { publicSupabase, supabase } from '../../lib/supabase'

export type EventOrganizerType = 'producer' | 'venue'
export type EventStatus = 'draft' | 'published' | 'cancelled'

export type EventRow = {
  id: string
  owner_user_id: string
  organizer_type: string
  producer_id: string | null
  organizer_venue_id: string | null
  venue_id: string | null
  title: string
  slug: string
  category: string | null
  description: string | null
  event_date: string
  doors_time: string | null
  start_time: string | null
  end_time: string | null
  event_timezone: string | null
  venue_name: string
  address_line_1: string | null
  address_line_2: string | null
  city: string
  state: string
  postal_code: string | null
  country: string | null
  latitude: number | null
  longitude: number | null
  event_image_url: string | null
  status: string
  created_at: string
  updated_at: string
}

export type StreetTeamEvent = {
  id: string
  ownerUserId: string
  organizerType: EventOrganizerType
  producerId: string | null
  organizerVenueId: string | null
  venueId: string | null
  title: string
  slug: string
  category: string
  description: string
  eventDate: string
  doorsTime: string
  startTime: string
  endTime: string
  eventTimezone: string
  venueName: string
  addressLine1: string
  addressLine2: string
  city: string
  state: string
  postalCode: string
  country: string
  latitude: number | null
  longitude: number | null
  eventImageUrl: string | null
  status: EventStatus
  createdAt: string
  updatedAt: string
}

export type EventFormInput = {
  addressLine1: string
  addressLine2: string
  category: string
  city: string
  country: string
  description: string
  doorsTime: string
  endTime: string
  eventDate: string
  postalCode: string
  startTime: string
  state: string
  status: EventStatus
  title: string
  venueName: string
}

export type CreateEventInput = EventFormInput & {
  organizerProfileId: string
  organizerType: EventOrganizerType
  ownerUserId: string
}

export type UpdateEventInput = EventFormInput

const eventSelect =
  'id, owner_user_id, organizer_type, producer_id, organizer_venue_id, venue_id, title, slug, category, description, event_date, doors_time, start_time, end_time, event_timezone, venue_name, address_line_1, address_line_2, city, state, postal_code, country, latitude, longitude, event_image_url, status, created_at, updated_at'

export function generateEventSlug(title: string) {
  const slug = title
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'event'
}

export function isDuplicateEventSlugError(error: unknown) {
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

export async function fetchPublishedEvents(limit?: number) {
  let query = publicSupabase
    .from('events')
    .select(eventSelect)
    .eq('status', 'published')
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return ((data ?? []) as EventRow[]).map(mapEventRow)
}

export async function fetchUpcomingPublishedEvents(limit?: number) {
  let query = publicSupabase
    .from('events')
    .select(eventSelect)
    .eq('status', 'published')
    .gte('event_date', getTodayDateString())
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return ((data ?? []) as EventRow[]).map(mapEventRow)
}

export async function fetchUpcomingPublishedEventsByIds(eventIds: string[]) {
  if (eventIds.length === 0) {
    return []
  }

  const { data, error } = await publicSupabase
    .from('events')
    .select(eventSelect)
    .in('id', eventIds)
    .eq('status', 'published')
    .gte('event_date', getTodayDateString())
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: false })

  if (error) {
    throw error
  }

  return ((data ?? []) as EventRow[]).map(mapEventRow)
}

export async function fetchEventsByIds(eventIds: string[]) {
  const uniqueEventIds = [...new Set(eventIds)]

  if (uniqueEventIds.length === 0) {
    return []
  }

  const { data, error } = await publicSupabase
    .from('events')
    .select(eventSelect)
    .in('id', uniqueEventIds)
    .eq('status', 'published')
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: false })

  if (error) {
    throw error
  }

  return ((data ?? []) as EventRow[]).map(mapEventRow)
}

export async function fetchPublishedEventBySlug(slug: string) {
  const { data, error } = await publicSupabase
    .from('events')
    .select(eventSelect)
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ? mapEventRow(data as EventRow) : null
}

export async function fetchOwnedEvents(
  ownerUserId: string,
  organizerType: EventOrganizerType,
  organizerProfileId: string,
) {
  let query = supabase
    .from('events')
    .select(eventSelect)
    .eq('owner_user_id', ownerUserId)
    .eq('organizer_type', organizerType)
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true, nullsFirst: false })

  query =
    organizerType === 'producer'
      ? query.eq('producer_id', organizerProfileId)
      : query.eq('organizer_venue_id', organizerProfileId)

  const { data, error } = await query

  if (error) {
    throw error
  }

  return ((data ?? []) as EventRow[]).map(mapEventRow)
}

export async function createEvent(input: CreateEventInput) {
  const slug = generateEventSlug(input.title)
  const eventTimezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York'

  const { data, error } = await supabase
    .from('events')
    .insert({
      address_line_1: cleanOptionalText(input.addressLine1),
      address_line_2: cleanOptionalText(input.addressLine2),
      category: cleanOptionalText(input.category),
      city: cleanRequiredText(input.city),
      country: cleanOptionalText(input.country) ?? 'USA',
      description: cleanOptionalText(input.description),
      doors_time: cleanOptionalText(input.doorsTime),
      end_time: cleanOptionalText(input.endTime),
      event_date: cleanRequiredText(input.eventDate),
      event_image_url: null,
      event_timezone: eventTimezone,
      latitude: null,
      longitude: null,
      organizer_type: input.organizerType,
      organizer_venue_id:
        input.organizerType === 'venue' ? input.organizerProfileId : null,
      owner_user_id: input.ownerUserId,
      postal_code: cleanOptionalText(input.postalCode),
      producer_id:
        input.organizerType === 'producer' ? input.organizerProfileId : null,
      slug,
      start_time: cleanOptionalText(input.startTime),
      state: cleanRequiredText(input.state),
      status: input.status,
      title: cleanRequiredText(input.title),
      venue_id: null,
      venue_name: cleanRequiredText(input.venueName),
    })
    .select(eventSelect)
    .single()

  if (error) {
    throw error
  }

  return mapEventRow(data as EventRow)
}

export async function updateEvent(
  ownerUserId: string,
  eventId: string,
  input: UpdateEventInput,
) {
  const { data, error } = await supabase
    .from('events')
    .update({
      address_line_1: cleanOptionalText(input.addressLine1),
      address_line_2: cleanOptionalText(input.addressLine2),
      category: cleanOptionalText(input.category),
      city: cleanRequiredText(input.city),
      country: cleanOptionalText(input.country) ?? 'USA',
      description: cleanOptionalText(input.description),
      doors_time: cleanOptionalText(input.doorsTime),
      end_time: cleanOptionalText(input.endTime),
      event_date: cleanRequiredText(input.eventDate),
      postal_code: cleanOptionalText(input.postalCode),
      start_time: cleanOptionalText(input.startTime),
      state: cleanRequiredText(input.state),
      status: input.status,
      title: cleanRequiredText(input.title),
      venue_name: cleanRequiredText(input.venueName),
    })
    .eq('id', eventId)
    .eq('owner_user_id', ownerUserId)
    .select(eventSelect)
    .single()

  if (error) {
    throw error
  }

  return mapEventRow(data as EventRow)
}

export async function updateEventImageUrl(
  ownerUserId: string,
  eventId: string,
  eventImageUrl: string,
) {
  const { data, error } = await supabase
    .from('events')
    .update({ event_image_url: eventImageUrl })
    .eq('id', eventId)
    .eq('owner_user_id', ownerUserId)
    .select(eventSelect)
    .single()

  if (error) {
    throw error
  }

  return mapEventRow(data as EventRow)
}

export async function cancelEvent(ownerUserId: string, eventId: string) {
  const { data, error } = await supabase
    .from('events')
    .update({ status: 'cancelled' })
    .eq('id', eventId)
    .eq('owner_user_id', ownerUserId)
    .select(eventSelect)
    .single()

  if (error) {
    throw error
  }

  return mapEventRow(data as EventRow)
}

export async function deleteEvent(ownerUserId: string, eventId: string) {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)
    .eq('owner_user_id', ownerUserId)

  if (error) {
    throw error
  }
}

export function formatEventDate(eventDate: string) {
  const [year, month, day] = eventDate.split('-').map(Number)

  if (!year || !month || !day) {
    return eventDate
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

export function formatEventTime(eventTime: string) {
  const [hours, minutes] = eventTime.split(':').map(Number)

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return eventTime
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2000, 0, 1, hours, minutes))
}

export function formatEventLocation(event: StreetTeamEvent) {
  return [event.city, event.state]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ')
}

export function formatOrganizerType(organizerType: EventOrganizerType) {
  return organizerType === 'producer' ? 'Producer event' : 'Venue event'
}

export function formatEventStatus(status: EventStatus) {
  if (status === 'draft') {
    return 'Draft'
  }

  if (status === 'cancelled') {
    return 'Cancelled'
  }

  return 'Published'
}

function mapEventRow(row: EventRow): StreetTeamEvent {
  return {
    addressLine1: row.address_line_1?.trim() ?? '',
    addressLine2: row.address_line_2?.trim() ?? '',
    category: row.category?.trim() ?? '',
    city: row.city,
    country: row.country?.trim() ?? '',
    createdAt: row.created_at,
    description: row.description?.trim() ?? '',
    doorsTime: row.doors_time ?? '',
    endTime: row.end_time ?? '',
    eventDate: row.event_date,
    eventImageUrl: row.event_image_url,
    eventTimezone: row.event_timezone?.trim() ?? '',
    id: row.id,
    latitude: row.latitude,
    longitude: row.longitude,
    organizerType: normalizeOrganizerType(row.organizer_type),
    organizerVenueId: row.organizer_venue_id,
    ownerUserId: row.owner_user_id,
    postalCode: row.postal_code?.trim() ?? '',
    producerId: row.producer_id,
    slug: row.slug,
    startTime: row.start_time ?? '',
    state: row.state,
    status: normalizeEventStatus(row.status),
    title: row.title,
    updatedAt: row.updated_at,
    venueId: row.venue_id,
    venueName: row.venue_name,
  }
}

function normalizeOrganizerType(value: string): EventOrganizerType {
  return value === 'venue' ? 'venue' : 'producer'
}

function normalizeEventStatus(value: string): EventStatus {
  if (value === 'draft' || value === 'cancelled') {
    return value
  }

  return 'published'
}

function cleanOptionalText(value: string) {
  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : null
}

function cleanRequiredText(value: string) {
  return value.trim()
}

function getTodayDateString() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
