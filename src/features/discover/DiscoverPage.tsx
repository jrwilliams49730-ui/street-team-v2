import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatFollowerLabel } from '../follows/follows'
import ProfileImageAvatar from '../profile-images/ProfileImageAvatar'
import {
  fetchPerformers,
  type Performer,
} from '../performers/performers'
import { fetchProducers, type Producer } from '../producers/producers'
import { fetchVenues, type Venue } from '../venues/venues'

function SupabaseStatusCard() {
  const [status, setStatus] = useState<'checking' | 'connected' | 'failed'>(
    'checking',
  )

  useEffect(() => {
    let isMounted = true

    async function checkConnection() {
      try {
        const { error } = await supabase.auth.getSession()

        if (!isMounted) {
          return
        }

        setStatus(error ? 'failed' : 'connected')
      } catch {
        if (isMounted) {
          setStatus('failed')
        }
      }
    }

    void checkConnection()

    return () => {
      isMounted = false
    }
  }, [])

  const statusText = {
    checking: 'Checking Supabase connection...',
    connected: 'Supabase connected.',
    failed: 'Supabase connection failed.',
  }[status]

  return (
    <aside className="backend-status-card" data-status={status}>
      <span aria-hidden="true" />
      <p>{statusText}</p>
    </aside>
  )
}

function FeaturedProducersSection() {
  const [producers, setProducers] = useState<Producer[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )

  useEffect(() => {
    let isMounted = true

    async function loadFeaturedProducers() {
      try {
        const nextProducers = await fetchProducers(3)

        if (isMounted) {
          setProducers(nextProducers)
          setStatus('ready')
        }
      } catch {
        if (isMounted) {
          setStatus('error')
        }
      }
    }

    void loadFeaturedProducers()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <section className="featured-section">
      <div className="featured-section-header">
        <h3>Featured producers</h3>
      </div>

      {status === 'loading' ? (
        <p className="featured-empty-state">Loading featured producers...</p>
      ) : null}

      {status === 'error' ? (
        <p className="featured-empty-state">
          Featured producers could not load.
        </p>
      ) : null}

      {status === 'ready' && producers.length === 0 ? (
        <p className="featured-empty-state">
          Featured producers will appear here once profiles are created.
        </p>
      ) : null}

      {status === 'ready' && producers.length > 0 ? (
        <div className="featured-grid">
          {producers.map((producer) => (
            <Link
              key={producer.id}
              to={`/producers/${producer.slug}`}
              className="featured-card"
            >
              <ProfileImageAvatar
                className="featured-avatar is-producer"
                imageUrl={producer.imageUrl}
                initials={producer.initials}
                name={producer.name}
              />

              <div className="featured-card-copy">
                <h4>{producer.name}</h4>
                <p>
                  {producer.category} | {producer.location}
                </p>
                <span>{formatFollowerLabel(producer.followerCount)}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      <Link to="/producers" className="view-all-link">
        View all producers
      </Link>
    </section>
  )
}

function FeaturedPerformersSection() {
  const [performers, setPerformers] = useState<Performer[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )

  useEffect(() => {
    let isMounted = true

    async function loadFeaturedPerformers() {
      try {
        const nextPerformers = await fetchPerformers(3)

        if (isMounted) {
          setPerformers(nextPerformers)
          setStatus('ready')
        }
      } catch {
        if (isMounted) {
          setStatus('error')
        }
      }
    }

    void loadFeaturedPerformers()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <section className="featured-section">
      <div className="featured-section-header">
        <h3>Featured performers</h3>
      </div>

      {status === 'loading' ? (
        <p className="featured-empty-state">Loading featured performers...</p>
      ) : null}

      {status === 'error' ? (
        <p className="featured-empty-state">
          Featured performers could not load.
        </p>
      ) : null}

      {status === 'ready' && performers.length === 0 ? (
        <p className="featured-empty-state">
          Featured performers will appear here once profiles are created.
        </p>
      ) : null}

      {status === 'ready' && performers.length > 0 ? (
        <div className="featured-grid">
          {performers.map((performer) => (
            <Link
              key={performer.id}
              to={`/performers/${performer.slug}`}
              className="featured-card"
            >
              <ProfileImageAvatar
                className="featured-avatar is-performer"
                imageUrl={performer.imageUrl}
                initials={performer.initials}
                name={performer.name}
              />

              <div className="featured-card-copy">
                <h4>{performer.name}</h4>
                <p>
                  {performer.category} | {performer.location}
                </p>
                <span>{formatFollowerLabel(performer.followerCount)}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      <Link to="/performers" className="view-all-link">
        View all performers
      </Link>
    </section>
  )
}

function FeaturedVenuesSection() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )

  useEffect(() => {
    let isMounted = true

    async function loadFeaturedVenues() {
      try {
        const nextVenues = await fetchVenues(3)

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

    void loadFeaturedVenues()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <section className="featured-section">
      <div className="featured-section-header">
        <h3>Featured venues</h3>
      </div>

      {status === 'loading' ? (
        <p className="featured-empty-state">Loading featured venues...</p>
      ) : null}

      {status === 'error' ? (
        <p className="featured-empty-state">Featured venues could not load.</p>
      ) : null}

      {status === 'ready' && venues.length === 0 ? (
        <p className="featured-empty-state">
          Featured venues will appear here once profiles are created.
        </p>
      ) : null}

      {status === 'ready' && venues.length > 0 ? (
        <div className="featured-grid">
          {venues.map((venue) => (
            <Link
              key={venue.id}
              to={`/venues/${venue.slug}`}
              className="featured-card"
            >
              <ProfileImageAvatar
                className="featured-avatar is-venue"
                imageUrl={venue.imageUrl}
                initials={venue.initials}
                name={venue.name}
              />

              <div className="featured-card-copy">
                <h4>{venue.name}</h4>
                <p>
                  {venue.category} | {venue.location}
                </p>
                <span>{formatFollowerLabel(venue.followerCount)}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      <Link to="/venues" className="view-all-link">
        View all venues
      </Link>
    </section>
  )
}

function DiscoverPage() {
  return (
    <section className="discover-page">
      <header className="discover-hero">
        <p className="eyebrow">Street Team Network</p>
        <h2>Discover the live scene</h2>
        <p>
          Find performers, producers, and venues worth following so the next
          great show is already on your radar.
        </p>
      </header>

      <FeaturedPerformersSection />
      <FeaturedProducersSection />
      <FeaturedVenuesSection />

      <SupabaseStatusCard />
    </section>
  )
}

export default DiscoverPage
