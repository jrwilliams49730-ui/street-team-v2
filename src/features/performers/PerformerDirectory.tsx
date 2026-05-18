import { Link } from 'react-router-dom'
import { formatFollowerCount, performers } from './performers'

function PerformerDirectory() {
  return (
    <section className="performer-directory">
      <header className="section-heading">
        <h2>Performers</h2>
        <p>Follow entertainers to keep up with the shows they bring to life.</p>
      </header>

      <div className="performer-grid">
        {performers.map((performer) => (
          <Link
            key={performer.slug}
            to={`/performers/${performer.slug}`}
            className="performer-card"
          >
            <div className="performer-card-header">
              <div className="performer-avatar" aria-hidden="true">
                {performer.initials}
              </div>

              <div>
                <h3>{performer.name}</h3>
                <p>
                  {performer.category} | {performer.location}
                </p>
              </div>
            </div>

            <p className="performer-bio">{performer.shortBio}</p>
            <span className="follower-count">
              {formatFollowerCount(performer.followerCount)} followers
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default PerformerDirectory
