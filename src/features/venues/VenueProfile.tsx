import { Link, useParams } from 'react-router-dom'
import { findVenueBySlug, formatFollowerCount } from './venues'

function VenueProfile() {
  const { slug } = useParams()
  const venue = findVenueBySlug(slug)

  if (!venue) {
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
          <div className="venue-avatar profile-avatar" aria-hidden="true">
            {venue.initials}
          </div>

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
