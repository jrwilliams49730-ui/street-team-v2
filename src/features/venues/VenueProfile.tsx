import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ProfileImageAvatar from '../profile-images/ProfileImageAvatar'
import { fetchVenueBySlug, formatFollowerCount, type Venue } from './venues'

function VenueProfile() {
  const { slug } = useParams()
  const [venue, setVenue] = useState<Venue | null>(null)
  const [status, setStatus] = useState<
    'loading' | 'ready' | 'not-found' | 'error'
  >('loading')

  useEffect(() => {
    let isMounted = true

    async function loadVenue() {
      if (!slug) {
        setStatus('not-found')
        return
      }

      try {
        const nextVenue = await fetchVenueBySlug(slug)

        if (!isMounted) {
          return
        }

        if (nextVenue) {
          setVenue(nextVenue)
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

    void loadVenue()

    return () => {
      isMounted = false
    }
  }, [slug])

  if (status === 'loading') {
    return (
      <section className="content-card empty-state">
        <h2>Loading venue...</h2>
        <p>Getting the latest venue profile.</p>
      </section>
    )
  }

  if (status === 'error') {
    return (
      <section className="content-card empty-state">
        <h2>Venue profile could not load</h2>
        <p>Please try again in a moment.</p>
        <Link to="/venues" className="back-link">
          Back to venues
        </Link>
      </section>
    )
  }

  if (status === 'not-found' || !venue) {
    return (
      <section className="content-card empty-state">
        <h2>Venue not found</h2>
        <p>That venue is not in the directory yet.</p>
        <Link to="/venues" className="back-link">
          Back to venues
        </Link>
      </section>
    )
  }

  return (
    <section className="venue-profile">
      <Link to="/venues" className="back-link">
        Back to venues
      </Link>

      <article className="profile-card">
        <div className="profile-hero">
          <ProfileImageAvatar
            className="venue-avatar profile-avatar"
            imageUrl={venue.imageUrl}
            initials={venue.initials}
            name={venue.name}
          />

          <div className="profile-copy">
            <p className="eyebrow">{venue.category}</p>
            <h2>{venue.name}</h2>
            <p>{venue.location}</p>
          </div>
        </div>

        <div className="profile-meta">
          <strong>{formatFollowerCount(venue.followerCount)}</strong>
          <span>followers</span>
        </div>

        <p className="profile-bio">{venue.description}</p>

        <button type="button" className="follow-button">
          Follow
        </button>
      </article>

      <section className="upcoming-panel">
        <h3>Upcoming events</h3>
        <p>Upcoming events will appear here.</p>
      </section>
    </section>
  )
}

export default VenueProfile
