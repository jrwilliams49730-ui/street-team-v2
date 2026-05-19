import { supabase } from '../../lib/supabase'

export type ProducerRow = {
  id: string
  owner_user_id: string
  name: string
  slug: string
  producer_type: string
  city: string | null
  state: string | null
  bio: string | null
  image_url: string | null
  created_at: string
  updated_at: string
}

export type Producer = {
  id: string
  name: string
  slug: string
  category: string
  location: string
  initials: string
  shortBio: string
  bio: string
  imageUrl: string | null
  followerCount: number
}

export type CreateProducerInput = {
  ownerUserId: string
  name: string
  producerType: string
  city: string
  state: string
  bio: string
}

const producerSelect =
  'id, owner_user_id, name, slug, producer_type, city, state, bio, image_url, created_at, updated_at'

export function generateProducerSlug(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'producer'
}

export function formatFollowerCount(count: number) {
  return new Intl.NumberFormat('en-US').format(count)
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

export async function fetchProducers(limit?: number) {
  let query = supabase
    .from('producers')
    .select(producerSelect)
    .order('created_at', { ascending: false })

  if (limit) {
    query = query.limit(limit)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  return ((data ?? []) as ProducerRow[]).map(mapProducerRow)
}

export async function fetchOwnedProducers(ownerUserId: string) {
  const { data, error } = await supabase
    .from('producers')
    .select(producerSelect)
    .eq('owner_user_id', ownerUserId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return ((data ?? []) as ProducerRow[]).map(mapProducerRow)
}

export async function fetchProducerBySlug(slug: string) {
  const { data, error } = await supabase
    .from('producers')
    .select(producerSelect)
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ? mapProducerRow(data as ProducerRow) : null
}

export async function createProducerProfile(input: CreateProducerInput) {
  const slug = generateProducerSlug(input.name)

  const { data, error } = await supabase
    .from('producers')
    .insert({
      owner_user_id: input.ownerUserId,
      name: input.name.trim(),
      slug,
      producer_type: input.producerType.trim(),
      city: cleanOptionalText(input.city),
      state: cleanOptionalText(input.state),
      bio: cleanOptionalText(input.bio),
      image_url: null,
    })
    .select(producerSelect)
    .single()

  if (error) {
    throw error
  }

  return mapProducerRow(data as ProducerRow)
}

export async function updateProducerImageUrl(
  ownerUserId: string,
  profileId: string,
  imageUrl: string,
) {
  const { data, error } = await supabase
    .from('producers')
    .update({ image_url: imageUrl })
    .eq('id', profileId)
    .eq('owner_user_id', ownerUserId)
    .select(producerSelect)
    .single()

  if (error) {
    throw error
  }

  return mapProducerRow(data as ProducerRow)
}

function mapProducerRow(row: ProducerRow): Producer {
  const bio = row.bio?.trim() || 'This producer has not added a bio yet.'

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: row.producer_type,
    location: formatLocation(row.city, row.state),
    initials: getInitials(row.name),
    shortBio: createShortBio(bio),
    bio,
    imageUrl: row.image_url,
    followerCount: 0,
  }
}

function cleanOptionalText(value: string) {
  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : null
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
