import { Link } from 'react-router-dom'
import { formatFollowerCount, venues } from './venues'

function VenueDirectory() {
  return (
    <section className="venue-directory">
      <header className="section-heading">
        <h2>Venues</h2>
        <p>Follow the places hosting live events near you.</p>
      </header>

      <div className="venue-grid">
        {venues.map((venue) => (
          <Link
            key={venue.slug}
            to={`/venues/${venue.slug}`}
            className="venue-card"
          >
            <div className="venue-card-header">
              <div className="venue-avatar" aria-hidden="true">
                {venue.initials}
              </div>

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
    </section>
  )
}

export default VenueDirectory
