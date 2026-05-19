import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ProfileImageAvatar from '../profile-images/ProfileImageAvatar'
import {
  fetchProducerBySlug,
  formatFollowerCount,
  type Producer,
} from './producers'

function ProducerProfile() {
  const { slug } = useParams()
  const [producer, setProducer] = useState<Producer | null>(null)
  const [status, setStatus] = useState<
    'loading' | 'ready' | 'not-found' | 'error'
  >('loading')

  useEffect(() => {
    let isMounted = true

    async function loadProducer() {
      if (!slug) {
        setStatus('not-found')
        return
      }

      try {
        const nextProducer = await fetchProducerBySlug(slug)

        if (!isMounted) {
          return
        }

        if (nextProducer) {
          setProducer(nextProducer)
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

    void loadProducer()

    return () => {
      isMounted = false
    }
  }, [slug])

  if (status === 'loading') {
    return (
      <section className="content-card empty-state">
        <h2>Loading producer...</h2>
        <p>Getting the latest producer profile.</p>
      </section>
    )
  }

  if (status === 'error') {
    return (
      <section className="content-card empty-state">
        <h2>Producer profile could not load</h2>
        <p>Please try again in a moment.</p>
        <Link to="/producers" className="back-link">
          Back to producers
        </Link>
      </section>
    )
  }

  if (status === 'not-found' || !producer) {
    return (
      <section className="content-card empty-state">
        <h2>Producer not found</h2>
        <p>That producer is not in the directory yet.</p>
        <Link to="/producers" className="back-link">
          Back to producers
        </Link>
      </section>
    )
  }

  return (
    <section className="producer-profile">
      <Link to="/producers" className="back-link">
        Back to producers
      </Link>

      <article className="profile-card">
        <div className="profile-hero">
          <ProfileImageAvatar
            className="producer-avatar profile-avatar"
            imageUrl={producer.imageUrl}
            initials={producer.initials}
            name={producer.name}
          />

          <div className="profile-copy">
            <p className="eyebrow">{producer.category}</p>
            <h2>{producer.name}</h2>
            <p>{producer.location}</p>
          </div>
        </div>

        <div className="profile-meta">
          <strong>{formatFollowerCount(producer.followerCount)}</strong>
          <span>followers</span>
        </div>

        <p className="profile-bio">{producer.bio}</p>

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

export default ProducerProfile
