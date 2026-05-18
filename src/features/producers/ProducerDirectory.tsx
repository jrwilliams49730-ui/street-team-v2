import { Link } from 'react-router-dom'
import { formatFollowerCount, producers } from './producers'

function ProducerDirectory() {
  return (
    <section className="producer-directory">
      <header className="section-heading">
        <h2>Producers</h2>
        <p>
          Follow the people and teams creating live events worth showing up for.
        </p>
      </header>

      <div className="producer-grid">
        {producers.map((producer) => (
          <Link
            key={producer.slug}
            to={`/producers/${producer.slug}`}
            className="producer-card"
          >
            <div className="producer-card-header">
              <div className="producer-avatar" aria-hidden="true">
                {producer.initials}
              </div>

              <div>
                <h3>{producer.name}</h3>
                <p>
                  {producer.category} | {producer.location}
                </p>
              </div>
            </div>

            <p className="producer-bio">{producer.shortBio}</p>
            <span className="follower-count">
              {formatFollowerCount(producer.followerCount)} followers
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default ProducerDirectory
