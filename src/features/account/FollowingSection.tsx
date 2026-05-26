import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchUserFollows,
  formatFollowerLabel,
  type FollowTargetType,
  type UserFollow,
} from '../follows/follows'
import {
  fetchPerformersByIds,
  type Performer,
} from '../performers/performers'
import ProfileImageAvatar from '../profile-images/ProfileImageAvatar'
import { fetchProducersByIds, type Producer } from '../producers/producers'
import { fetchVenuesByIds, type Venue } from '../venues/venues'

type FollowedProfile = {
  category: string
  followId: string
  followerCount: number
  id: string
  imageUrl: string | null
  initials: string
  location: string
  name: string
  profileType: FollowTargetType
  publicPath: string
  typeLabel: string
}

type FollowingSectionProps = {
  ownerUserId: string
}

function FollowingSection({ ownerUserId }: FollowingSectionProps) {
  const [profiles, setProfiles] = useState<FollowedProfile[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )

  useEffect(() => {
    let isMounted = true

    async function loadFollowing() {
      setStatus('loading')

      try {
        const follows = await fetchUserFollows(ownerUserId)
        const [performers, producers, venues] = await Promise.all([
          fetchPerformersByIds(getTargetIds(follows, 'performer')),
          fetchProducersByIds(getTargetIds(follows, 'producer')),
          fetchVenuesByIds(getTargetIds(follows, 'venue')),
        ])

        if (!isMounted) {
          return
        }

        setProfiles(mapFollowedProfiles(follows, performers, producers, venues))
        setStatus('ready')
      } catch {
        if (isMounted) {
          setStatus('error')
        }
      }
    }

    void loadFollowing()

    return () => {
      isMounted = false
    }
  }, [ownerUserId])

  return (
    <section className="account-card following-section">
      <header className="section-heading">
        <h2>Following</h2>
        <p>Profiles you are keeping up with across Street Team.</p>
      </header>

      {status === 'loading' ? (
        <p className="following-state">Loading followed profiles...</p>
      ) : null}

      {status === 'error' ? (
        <p className="following-state">
          Followed profiles could not be loaded.
        </p>
      ) : null}

      {status === 'ready' && profiles.length === 0 ? (
        <p className="following-state">
          You are not following any performers, producers, or venues yet.
        </p>
      ) : null}

      {status === 'ready' && profiles.length > 0 ? (
        <div className="following-grid">
          {profiles.map((profile) => (
            <Link
              key={profile.followId}
              to={profile.publicPath}
              className="following-card"
            >
              <ProfileImageAvatar
                className={`following-avatar ${profile.profileType}-avatar`}
                imageUrl={profile.imageUrl}
                initials={profile.initials}
                name={profile.name}
              />

              <div className="following-copy">
                <span>{profile.typeLabel}</span>
                <h3>{profile.name}</h3>
                <p>
                  {profile.category} | {profile.location}
                </p>
                <p>{formatFollowerLabel(profile.followerCount)}</p>
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function getTargetIds(follows: UserFollow[], targetType: FollowTargetType) {
  return Array.from(
    new Set(
      follows
        .filter((follow) => follow.targetType === targetType)
        .map((follow) => follow.targetId),
    ),
  )
}

function mapFollowedProfiles(
  follows: UserFollow[],
  performers: Performer[],
  producers: Producer[],
  venues: Venue[],
) {
  const performerMap = new Map(
    performers.map((performer) => [performer.id, performer]),
  )
  const producerMap = new Map(
    producers.map((producer) => [producer.id, producer]),
  )
  const venueMap = new Map(venues.map((venue) => [venue.id, venue]))

  return follows
    .map((follow) => {
      if (follow.targetType === 'performer') {
        const performer = performerMap.get(follow.targetId)
        return performer ? mapPerformerFollow(follow, performer) : null
      }

      if (follow.targetType === 'producer') {
        const producer = producerMap.get(follow.targetId)
        return producer ? mapProducerFollow(follow, producer) : null
      }

      const venue = venueMap.get(follow.targetId)
      return venue ? mapVenueFollow(follow, venue) : null
    })
    .filter((profile): profile is FollowedProfile => Boolean(profile))
}

function mapPerformerFollow(
  follow: UserFollow,
  performer: Performer,
): FollowedProfile {
  return {
    category: performer.category,
    followId: follow.id,
    followerCount: performer.followerCount,
    id: performer.id,
    imageUrl: performer.imageUrl,
    initials: performer.initials,
    location: performer.location,
    name: performer.name,
    profileType: 'performer',
    publicPath: `/app/performers/${performer.slug}`,
    typeLabel: 'Performer',
  }
}

function mapProducerFollow(
  follow: UserFollow,
  producer: Producer,
): FollowedProfile {
  return {
    category: producer.category,
    followId: follow.id,
    followerCount: producer.followerCount,
    id: producer.id,
    imageUrl: producer.imageUrl,
    initials: producer.initials,
    location: producer.location,
    name: producer.name,
    profileType: 'producer',
    publicPath: `/app/producers/${producer.slug}`,
    typeLabel: 'Producer',
  }
}

function mapVenueFollow(follow: UserFollow, venue: Venue): FollowedProfile {
  return {
    category: venue.category,
    followId: follow.id,
    followerCount: venue.followerCount,
    id: venue.id,
    imageUrl: venue.imageUrl,
    initials: venue.initials,
    location: venue.location,
    name: venue.name,
    profileType: 'venue',
    publicPath: `/app/venues/${venue.slug}`,
    typeLabel: 'Venue',
  }
}

export default FollowingSection
