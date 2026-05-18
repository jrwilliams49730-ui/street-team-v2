import { Link, useParams } from 'react-router-dom'
import { findProducerBySlug, formatFollowerCount } from './producers'

function ProducerProfile() {
  const { slug } = useParams()
  const producer = findProducerBySlug(slug)

  if (!producer) {
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
          <div className="producer-avatar profile-avatar" aria-hidden="true">
            {producer.initials}
          </div>

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
