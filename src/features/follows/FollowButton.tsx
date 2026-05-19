import { useEffect, useState } from 'react'
import { useAuth } from '../account/auth-context'
import {
  createFollow,
  deleteFollow,
  fetchFollowState,
  formatFollowerLabel,
  type FollowTargetType,
} from './follows'

type FollowButtonProps = {
  followerCount: number
  onFollowerCountChange: (followerCount: number) => void
  targetId: string
  targetType: FollowTargetType
}

function FollowButton({
  followerCount,
  onFollowerCountChange,
  targetId,
  targetType,
}: FollowButtonProps) {
  const { isLoading, session } = useAuth()
  const [isFollowing, setIsFollowing] = useState(false)
  const [status, setStatus] = useState<'checking' | 'ready' | 'saving'>(
    'checking',
  )
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadFollowState() {
      if (isLoading) {
        return
      }

      setStatus('checking')
      setMessage(null)

      try {
        const nextState = await fetchFollowState(
          targetType,
          targetId,
          session?.user.id,
        )

        if (!isMounted) {
          return
        }

        setIsFollowing(nextState.isFollowing)
        onFollowerCountChange(nextState.followerCount)
        setStatus('ready')
      } catch {
        if (isMounted) {
          setMessage('Follower details could not load. Please try again.')
          setStatus('ready')
        }
      }
    }

    void loadFollowState()

    return () => {
      isMounted = false
    }
  }, [isLoading, onFollowerCountChange, session?.user.id, targetId, targetType])

  async function handleClick() {
    if (!session) {
      setMessage('Create an account or log in to follow profiles.')
      return
    }

    setStatus('saving')
    setMessage(null)

    try {
      if (isFollowing) {
        await deleteFollow(session.user.id, targetType, targetId)
      } else {
        await createFollow(session.user.id, targetType, targetId)
      }

      const nextState = await fetchFollowState(
        targetType,
        targetId,
        session.user.id,
      )

      setIsFollowing(nextState.isFollowing)
      onFollowerCountChange(nextState.followerCount)
    } catch {
      setMessage('Follow status could not be updated. Please try again.')
    } finally {
      setStatus('ready')
    }
  }

  return (
    <div className="follow-control">
      <button
        type="button"
        className="follow-button"
        aria-pressed={isFollowing}
        disabled={status !== 'ready'}
        onClick={() => {
          void handleClick()
        }}
      >
        {isFollowing ? 'Following' : 'Follow'}
      </button>

      {message ? <p className="follow-message">{message}</p> : null}
      <span className="sr-only">{formatFollowerLabel(followerCount)}</span>
    </div>
  )
}

export default FollowButton
