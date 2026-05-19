import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProfileImageAvatar from '../profile-images/ProfileImageAvatar'
import { fetchVenues, formatFollowerCount, type Venue } from './venues'

function VenueDirectory() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )

  useEffect(() => {
    let isMounted = true

    async function loadVenues() {
      try {
        const nextVenues = await fetchVenues()

        if (isMounted) {
          setVenues(nextVenues)
          setStatus('ready')
        }
      } catch {
        if (isMounted) {
          setStatus('error')
        }
      }
    }

    void loadVenues()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <section className="venue-directory">
      <header className="section-heading">
        <h2>Venues</h2>
        <p>Follow the places hosting live events near you.</p>
      </header>

      {status === 'loading' ? (
        <DirectoryStateCard message="Loading venues..." />
      ) : null}

      {status === 'error' ? (
        <DirectoryStateCard message="Venue directory could not load." />
      ) : null}

      {status === 'ready' && venues.length === 0 ? (
        <DirectoryStateCard message="No venues have been added yet." />
      ) : null}

      {status === 'ready' && venues.length > 0 ? (
        <div className="venue-grid">
          {venues.map((venue) => (
            <Link
              key={venue.id}
              to={`/venues/${venue.slug}`}
              className="venue-card"
            >
              <div className="venue-card-header">
                <ProfileImageAvatar
                  className="venue-avatar"
                  imageUrl={venue.imageUrl}
                  initials={venue.initials}
                  name={venue.name}
                />

                <div>
                  <h3>{venue.name}</h3>
                  <p>
                    {venue.category} | {venue.location}
                  </p>
                </div>
              </div>

              <p className="venue-description">{venue.shortDescription}</p>
              <span className="follower-count">
                {formatFollowerCount(venue.followerCount)} followers
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function DirectoryStateCard({ message }: { message: string }) {
  return (
    <div className="directory-state-card">
      <p>{message}</p>
    </div>
  )
}

export default VenueDirectory
