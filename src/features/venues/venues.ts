import { supabase } from '../../lib/supabase'
import { fetchFollowerCounts } from '../follows/follows'

export type VenueRow = {
  id: string
  owner_user_id: string
  name: string
  slug: string
  venue_type: string
  city: string | null
  state: string | null
  description: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

export type Venue = {
  id: string
  name: string
  slug: string
  category: string
  city: string
  state: string
  location: string
  initials: string
  shortDescription: string
  description: string
  imageUrl: string | null
  followerCount: number
}

export type CreateVenueInput = {
  ownerUserId: string
  name: string
  venueType: string
  city: string
  state: string
  description: string
}

export type UpdateVenueInput = {
  name: string
  venueType: string
  city: string
  state: string
  description: string
}

const venueSelect =
  'id, owner_user_id, name, slug, venue_type, city, state, description, image_url, created_at, updated_at'

export function generateVenueSlug(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'venue'
}

export function isDuplicateSlugError(error: unknown) {
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

export async function fetchVenues(limit?: number) {
  let query = supabase
    .from('venues')
    .select(venueSelect)
    .order('created_at', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return withFollowerCounts(((data ?? []) as VenueRow[]).map(mapVenueRow))
}

export async function fetchOwnedVenues(ownerUserId: string) {
  const { data, error } = await supabase
    .from('venues')
    .select(venueSelect)
    .eq('owner_user_id', ownerUserId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return withFollowerCounts(((data ?? []) as VenueRow[]).map(mapVenueRow))
}

export async function fetchVenuesByIds(venueIds: string[]) {
  if (venueIds.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from('venues')
    .select(venueSelect)
    .in('id', venueIds)

  if (error) {
    throw error
  }

  return withFollowerCounts(((data ?? []) as VenueRow[]).map(mapVenueRow))
}

export async function fetchVenueBySlug(slug: string) {
  const { data, error } = await supabase
    .from('venues')
    .select(venueSelect)
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  const [venue] = await withFollowerCounts([mapVenueRow(data as VenueRow)])

  return venue
}

export async function createVenueProfile(input: CreateVenueInput) {
  const slug = generateVenueSlug(input.name)

  const { data, error } = await supabase
    .from('venues')
    .insert({
      owner_user_id: input.ownerUserId,
      name: input.name.trim(),
      slug,
      venue_type: input.venueType.trim(),
      city: cleanOptionalText(input.city),
      state: cleanOptionalText(input.state),
      description: cleanOptionalText(input.description),
      image_url: null,
    })
    .select(venueSelect)
    .single()

  if (error) {
    throw error
  }

  return mapVenueRow(data as VenueRow)
}

export async function updateVenueImageUrl(
  ownerUserId: string,
  profileId: string,
  imageUrl: string,
) {
  const { data, error } = await supabase
    .from('venues')
    .update({ image_url: imageUrl })
    .eq('id', profileId)
    .eq('owner_user_id', ownerUserId)
    .select(venueSelect)
    .single()

  if (error) {
    throw error
  }

  return mapVenueRow(data as VenueRow)
}

export async function updateVenueProfile(
  ownerUserId: string,
  profileId: string,
  input: UpdateVenueInput,
) {
  const { data, error } = await supabase
    .from('venues')
    .update({
      name: cleanRequiredText(input.name),
      venue_type: cleanRequiredText(input.venueType),
      city: cleanOptionalText(input.city),
      state: cleanOptionalText(input.state),
      description: cleanOptionalText(input.description),
    })
    .eq('id', profileId)
    .eq('owner_user_id', ownerUserId)
    .select(venueSelect)
    .single()

  if (error) {
    throw error
  }

  return mapVenueRow(data as VenueRow)
}

function mapVenueRow(row: VenueRow): Venue {
  const description =
    row.description?.trim() || 'This venue has not added a description yet.'

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: row.venue_type,
    city: row.city?.trim() ?? '',
    state: row.state?.trim() ?? '',
    location: formatLocation(row.city, row.state),
    initials: getInitials(row.name),
    shortDescription: createShortDescription(description),
    description,
    imageUrl: row.image_url,
    followerCount: 0,
  }
}

async function withFollowerCounts(venues: Venue[]) {
  const followerCounts = await fetchFollowerCounts(
    'venue',
    venues.map((venue) => venue.id),
  )

  return venues.map((venue) => ({
    ...venue,
    followerCount: followerCounts.get(venue.id) ?? 0,
  }))
}

function cleanOptionalText(value: string) {
  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : null
}

function cleanRequiredText(value: string) {
  return value.trim()
}

function formatLocation(city: string | null, state: string | null) {
  const locationParts = [city, state]
    .map((part) => part?.trim())
    .filter(Boolean)

  return locationParts.length > 0 ? locationParts.join(', ') : 'Location TBD'
}

function getInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return initials || 'ST'
}

function createShortDescription(description: string) {
  return description.length > 120
    ? `${description.slice(0, 117).trim()}...`
    : description
}
