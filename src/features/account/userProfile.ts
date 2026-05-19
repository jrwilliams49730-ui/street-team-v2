import { supabase } from '../../lib/supabase'

export type UserProfileRow = {
  id: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  city: string | null
  state: string | null
  created_at: string
  updated_at: string
}

export type UserProfile = {
  id: string
  displayName: string
  avatarUrl: string | null
  bio: string
  city: string
  state: string
  initials: string
}

export type UpdateUserProfileInput = {
  displayName: string
  bio: string
  city: string
  state: string
}

const profileSelect =
  'id, display_name, avatar_url, bio, city, state, created_at, updated_at'

export async function fetchUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select(profileSelect)
    .eq('id', userId)
    .single()

  if (error) {
    throw error
  }

  return mapUserProfileRow(data as UserProfileRow)
}

export async function updateUserProfile(
  userId: string,
  input: UpdateUserProfileInput,
) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      display_name: cleanRequiredText(input.displayName),
      bio: cleanOptionalText(input.bio),
      city: cleanOptionalText(input.city),
      state: cleanOptionalText(input.state),
    })
    .eq('id', userId)
    .select(profileSelect)
    .single()

  if (error) {
    throw error
  }

  return mapUserProfileRow(data as UserProfileRow)
}

export async function updateUserProfileAvatarUrl(
  userId: string,
  avatarUrl: string,
) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      avatar_url: avatarUrl,
    })
    .eq('id', userId)
    .select(profileSelect)
    .single()

  if (error) {
    throw error
  }

  return mapUserProfileRow(data as UserProfileRow)
}

function mapUserProfileRow(row: UserProfileRow): UserProfile {
  const displayName = row.display_name?.trim() || 'Street Team Fan'

  return {
    id: row.id,
    displayName,
    avatarUrl: row.avatar_url,
    bio: row.bio?.trim() ?? '',
    city: row.city?.trim() ?? '',
    state: row.state?.trim() ?? '',
    initials: getInitials(displayName),
  }
}

function cleanRequiredText(value: string) {
  return value.trim()
}

function cleanOptionalText(value: string) {
  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : null
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
