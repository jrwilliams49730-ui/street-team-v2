import { supabase } from '../../lib/supabase'

export type FollowTargetType = 'performer' | 'producer' | 'venue'

type FollowRow = {
  id: string
  target_id: string
}

export function formatFollowerCount(count: number) {
  return new Intl.NumberFormat('en-US').format(count)
}

export function formatFollowerNoun(count: number) {
  return count === 1 ? 'follower' : 'followers'
}

export function formatFollowerLabel(count: number) {
  return `${formatFollowerCount(count)} ${formatFollowerNoun(count)}`
}

export async function fetchFollowerCounts(
  targetType: FollowTargetType,
  targetIds: string[],
) {
  if (targetIds.length === 0) {
    return new Map<string, number>()
  }

  const { data, error } = await supabase
    .from('follows')
    .select('target_id')
    .eq('target_type', targetType)
    .in('target_id', targetIds)

  if (error) {
    throw error
  }

  return ((data ?? []) as Pick<FollowRow, 'target_id'>[]).reduce(
    (counts, follow) => {
      counts.set(follow.target_id, (counts.get(follow.target_id) ?? 0) + 1)
      return counts
    },
    new Map<string, number>(),
  )
}

export async function fetchFollowState(
  targetType: FollowTargetType,
  targetId: string,
  followerUserId?: string,
) {
  const [followerCount, isFollowing] = await Promise.all([
    fetchFollowerCount(targetType, targetId),
    followerUserId
      ? fetchIsFollowing(followerUserId, targetType, targetId)
      : Promise.resolve(false),
  ])

  return {
    followerCount,
    isFollowing,
  }
}

export async function createFollow(
  followerUserId: string,
  targetType: FollowTargetType,
  targetId: string,
) {
  const { error } = await supabase.from('follows').insert({
    follower_user_id: followerUserId,
    target_type: targetType,
    target_id: targetId,
  })

  if (error && !isDuplicateFollowError(error)) {
    throw error
  }
}

export async function deleteFollow(
  followerUserId: string,
  targetType: FollowTargetType,
  targetId: string,
) {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_user_id', followerUserId)
    .eq('target_type', targetType)
    .eq('target_id', targetId)

  if (error) {
    throw error
  }
}

async function fetchFollowerCount(
  targetType: FollowTargetType,
  targetId: string,
) {
  const { count, error } = await supabase
    .from('follows')
    .select('id', { count: 'exact', head: true })
    .eq('target_type', targetType)
    .eq('target_id', targetId)

  if (error) {
    throw error
  }

  return count ?? 0
}

async function fetchIsFollowing(
  followerUserId: string,
  targetType: FollowTargetType,
  targetId: string,
) {
  const { data, error } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_user_id', followerUserId)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return Boolean((data as Pick<FollowRow, 'id'> | null)?.id)
}

function isDuplicateFollowError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false
  }

  const maybeError = error as { code?: string; message?: string }

  return (
    maybeError.code === '23505' ||
    maybeError.message?.toLowerCase().includes('duplicate key') === true
  )
}
