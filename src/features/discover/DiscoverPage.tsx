import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  fetchPerformers,
  type Performer,
} from '../performers/performers'
import { fetchProducers, type Producer } from '../producers/producers'
import { venues } from '../venues/venues'

type FeaturedItem = {
  name: string
  slug: string
  category: string
  location: string
  initials: string
  followerCount: number
}

type FeaturedSection = {
  title: string
  viewAllLabel: string
  viewAllPath: string
  profileBasePath: string
  accentClass: string
  items: FeaturedItem[]
}

const mockFeaturedSections: FeaturedSection[] = [
  {
    title: 'Featured venues',
    viewAllLabel: 'View all venues',
    viewAllPath: '/venues',
    profileBasePath: '/venues',
    accentClass: 'is-venue',
    items: venues.slice(0, 3),
  },
]

function formatFollowerCount(count: number) {
  return new Intl.NumberFormat('en-US').format(count)
}

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
              <div className="featured-avatar is-producer" aria-hidden="true">
                {producer.initials}
              </div>

              <div className="featured-card-copy">
                <h4>{producer.name}</h4>
                <p>
                  {producer.category} | {producer.location}
                </p>
                <span>
                  {formatFollowerCount(producer.followerCount)} followers
                </span>
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
              <div
                className="featured-avatar is-performer"
                aria-hidden="true"
              >
                {performer.initials}
              </div>

              <div className="featured-card-copy">
                <h4>{performer.name}</h4>
                <p>
                  {performer.category} | {performer.location}
                </p>
                <span>
                  {formatFollowerCount(performer.followerCount)} followers
                </span>
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

      {mockFeaturedSections.map((section) => (
        <section key={section.title} className="featured-section">
          <div className="featured-section-header">
            <h3>{section.title}</h3>
          </div>

          <div className="featured-grid">
            {section.items.map((item) => (
              <Link
                key={item.slug}
                to={`${section.profileBasePath}/${item.slug}`}
                className="featured-card"
              >
                <div
                  className={`featured-avatar ${section.accentClass}`}
                  aria-hidden="true"
                >
                  {item.initials}
                </div>

                <div className="featured-card-copy">
                  <h4>{item.name}</h4>
                  <p>
                    {item.category} | {item.location}
                  </p>
                  <span>
                    {formatFollowerCount(item.followerCount)} followers
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <Link to={section.viewAllPath} className="view-all-link">
            {section.viewAllLabel}
          </Link>
        </section>
      ))}

      <SupabaseStatusCard />
    </section>
  )
}

export default DiscoverPage
