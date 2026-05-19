import { supabase } from '../../lib/supabase'
import { fetchFollowerCounts } from '../follows/follows'

export type PerformerRow = {
  id: string
  owner_user_id: string
  name: string
  slug: string
  performer_type: string
  city: string | null
  state: string | null
  bio: string | null
  image_url: string | null
  featured_media_url: string | null
  featured_media_type: string | null
  created_at: string
  updated_at: string
}

export type FeaturedMediaType = 'video' | 'audio'

export type Performer = {
  id: string
  name: string
  slug: string
  category: string
  city: string
  state: string
  location: string
  initials: string
  shortBio: string
  bio: string
  imageUrl: string | null
  featuredMediaUrl: string | null
  featuredMediaType: FeaturedMediaType | null
  followerCount: number
}

export type CreatePerformerInput = {
  ownerUserId: string
  name: string
  performerType: string
  city: string
  state: string
  bio: string
}

export type UpdatePerformerInput = {
  name: string
  performerType: string
  city: string
  state: string
  bio: string
}

export type UpdatePerformerFeaturedMediaInput = {
  featuredMediaUrl: string | null
  featuredMediaType: FeaturedMediaType | null
}

const performerSelect =
  'id, owner_user_id, name, slug, performer_type, city, state, bio, image_url, featured_media_url, featured_media_type, created_at, updated_at'

export function generatePerformerSlug(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'performer'
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

export async function fetchPerformers(limit?: number) {
  let query = supabase
    .from('performers')
    .select(performerSelect)
    .order('created_at', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return withFollowerCounts(((data ?? []) as PerformerRow[]).map(mapPerformerRow))
}

export async function fetchOwnedPerformers(ownerUserId: string) {
  const { data, error } = await supabase
    .from('performers')
    .select(performerSelect)
    .eq('owner_user_id', ownerUserId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return withFollowerCounts(((data ?? []) as PerformerRow[]).map(mapPerformerRow))
}

export async function fetchPerformersByIds(performerIds: string[]) {
  if (performerIds.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from('performers')
    .select(performerSelect)
    .in('id', performerIds)

  if (error) {
    throw error
  }

  return withFollowerCounts(((data ?? []) as PerformerRow[]).map(mapPerformerRow))
}

export async function fetchPerformerBySlug(slug: string) {
  const { data, error } = await supabase
    .from('performers')
    .select(performerSelect)
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  const [performer] = await withFollowerCounts([
    mapPerformerRow(data as PerformerRow),
  ])

  return performer
}

export async function createPerformerProfile(input: CreatePerformerInput) {
  const slug = generatePerformerSlug(input.name)

  const { data, error } = await supabase
    .from('performers')
    .insert({
      owner_user_id: input.ownerUserId,
      name: input.name.trim(),
      slug,
      performer_type: input.performerType.trim(),
      city: cleanOptionalText(input.city),
      state: cleanOptionalText(input.state),
      bio: cleanOptionalText(input.bio),
      image_url: null,
    })
    .select(performerSelect)
    .single()

  if (error) {
    throw error
  }

  return mapPerformerRow(data as PerformerRow)
}

export async function updatePerformerImageUrl(
  ownerUserId: string,
  profileId: string,
  imageUrl: string,
) {
  const { data, error } = await supabase
    .from('performers')
    .update({ image_url: imageUrl })
    .eq('id', profileId)
    .eq('owner_user_id', ownerUserId)
    .select(performerSelect)
    .single()

  if (error) {
    throw error
  }

  return mapPerformerRow(data as PerformerRow)
}

export async function updatePerformerProfile(
  ownerUserId: string,
  profileId: string,
  input: UpdatePerformerInput,
) {
  const { data, error } = await supabase
    .from('performers')
    .update({
      name: cleanRequiredText(input.name),
      performer_type: cleanRequiredText(input.performerType),
      city: cleanOptionalText(input.city),
      state: cleanOptionalText(input.state),
      bio: cleanOptionalText(input.bio),
    })
    .eq('id', profileId)
    .eq('owner_user_id', ownerUserId)
    .select(performerSelect)
    .single()

  if (error) {
    throw error
  }

  return mapPerformerRow(data as PerformerRow)
}

export async function updatePerformerFeaturedMedia(
  ownerUserId: string,
  profileId: string,
  input: UpdatePerformerFeaturedMediaInput,
) {
  const { data, error } = await supabase
    .from('performers')
    .update({
      featured_media_url: input.featuredMediaUrl,
      featured_media_type: input.featuredMediaType,
    })
    .eq('id', profileId)
    .eq('owner_user_id', ownerUserId)
    .select(performerSelect)
    .single()

  if (error) {
    throw error
  }

  return mapPerformerRow(data as PerformerRow)
}

function mapPerformerRow(row: PerformerRow): Performer {
  const bio = row.bio?.trim() || 'This performer has not added a bio yet.'

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: row.performer_type,
    city: row.city?.trim() ?? '',
    state: row.state?.trim() ?? '',
    location: formatLocation(row.city, row.state),
    initials: getInitials(row.name),
    shortBio: createShortBio(bio),
    bio,
    imageUrl: row.image_url,
    featuredMediaUrl: row.featured_media_url,
    featuredMediaType: normalizeFeaturedMediaType(row.featured_media_type),
    followerCount: 0,
  }
}

async function withFollowerCounts(performers: Performer[]) {
  const followerCounts = await fetchFollowerCounts(
    'performer',
    performers.map((performer) => performer.id),
  )

  return performers.map((performer) => ({
    ...performer,
    followerCount: followerCounts.get(performer.id) ?? 0,
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

function createShortBio(bio: string) {
  return bio.length > 120 ? `${bio.slice(0, 117).trim()}...` : bio
}

function normalizeFeaturedMediaType(value: string | null) {
  return value === 'video' || value === 'audio' ? value : null
}
