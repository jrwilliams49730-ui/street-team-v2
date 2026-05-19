import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import FollowButton from '../follows/FollowButton'
import { formatFollowerCount, formatFollowerNoun } from '../follows/follows'
import ProfileImageAvatar from '../profile-images/ProfileImageAvatar'
import FeaturedMediaPlayer from './FeaturedMediaPlayer'
import { canRenderFeaturedMedia } from './featuredMediaLinks'
import { fetchPerformerBySlug, type Performer } from './performers'
import PublicPerformerAppearances from './PublicPerformerAppearances'

function PerformerProfile() {
  const { slug } = useParams()
  const [performer, setPerformer] = useState<Performer | null>(null)
  const [status, setStatus] = useState<
    'loading' | 'ready' | 'not-found' | 'error'
  >('loading')

  useEffect(() => {
    let isMounted = true

    async function loadPerformer() {
      if (!slug) {
        setStatus('not-found')
        return
      }

      try {
        const nextPerformer = await fetchPerformerBySlug(slug)

        if (!isMounted) {
          return
        }

        if (nextPerformer) {
          setPerformer(nextPerformer)
          setStatus('ready')
        } else {
          setStatus('not-found')
        }
      } catch {
        if (isMounted) {
          setStatus('error')
        }
      }
    }

    void loadPerformer()

    return () => {
      isMounted = false
    }
  }, [slug])

  const updateFollowerCount = useCallback((followerCount: number) => {
    setPerformer((currentPerformer) =>
      currentPerformer ? { ...currentPerformer, followerCount } : null,
    )
  }, [])

  if (status === 'loading') {
    return (
      <section className="content-card empty-state">
        <h2>Loading performer...</h2>
        <p>Getting the latest performer profile.</p>
      </section>
    )
  }

  if (status === 'error') {
    return (
      <section className="content-card empty-state">
        <h2>Performer profile could not load</h2>
        <p>Please try again in a moment.</p>
        <Link to="/performers" className="back-link">
          Back to performers
        </Link>
      </section>
    )
  }

  if (status === 'not-found' || !performer) {
    return (
      <section className="content-card empty-state">
        <h2>Performer not found</h2>
        <p>That performer is not in the directory yet.</p>
        <Link to="/performers" className="back-link">
          Back to performers
        </Link>
      </section>
    )
  }

  return (
    <section className="performer-profile">
      <Link to="/performers" className="back-link">
        Back to performers
      </Link>

      <article className="profile-card">
        <div className="profile-hero">
          <ProfileImageAvatar
            className="performer-avatar profile-avatar"
            imageUrl={performer.imageUrl}
            initials={performer.initials}
            name={performer.name}
          />

          <div className="profile-copy">
            <p className="eyebrow">{performer.category}</p>
            <h2>{performer.name}</h2>
            <p>{performer.location}</p>
          </div>
        </div>

        <div className="profile-meta">
          <strong>{formatFollowerCount(performer.followerCount)}</strong>
          <span>{formatFollowerNoun(performer.followerCount)}</span>
        </div>

        <p className="profile-bio">{performer.bio}</p>

        <FollowButton
          followerCount={performer.followerCount}
          onFollowerCountChange={updateFollowerCount}
          targetId={performer.id}
          targetType="performer"
        />
      </article>

      {canRenderFeaturedMedia(
        performer.featuredMediaUrl,
        performer.featuredMediaType,
      ) &&
      performer.featuredMediaUrl &&
      performer.featuredMediaType ? (
        <section className="featured-media-section">
          <h3>Featured Media</h3>
          <FeaturedMediaPlayer
            mediaType={performer.featuredMediaType}
            mediaUrl={performer.featuredMediaUrl}
          />
        </section>
      ) : null}

      <PublicPerformerAppearances performerId={performer.id} />
    </section>
  )
}

export default PerformerProfile
