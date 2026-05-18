import { Link, useParams } from 'react-router-dom'
import {
  findPerformerBySlug,
  formatFollowerCount,
} from './performers'

function PerformerProfile() {
  const { slug } = useParams()
  const performer = findPerformerBySlug(slug)

  if (!performer) {
    return (
      <section className="content-card empty-state">
        <h2>Performer not found</h2>
        <p>That performer is not in the directory yet.</p>
        <Link to="/performers" className="back-link">
          Back to performers
        </Link>
      </section>
    )
  }

  return (
    <section className="performer-profile">
      <Link to="/performers" className="back-link">
        Back to performers
      </Link>

      <article className="profile-card">
        <div className="profile-hero">
          <div className="performer-avatar profile-avatar" aria-hidden="true">
            {performer.initials}
          </div>

          <div className="profile-copy">
            <p className="eyebrow">{performer.category}</p>
            <h2>{performer.name}</h2>
            <p>{performer.location}</p>
          </div>
        </div>

        <div className="profile-meta">
          <strong>{formatFollowerCount(performer.followerCount)}</strong>
          <span>followers</span>
        </div>

        <p className="profile-bio">{performer.bio}</p>

        <button type="button" className="follow-button">
          Follow
        </button>
      </article>

      <section className="upcoming-shows">
        <h3>Upcoming shows</h3>
        <p>Upcoming shows will appear here.</p>
      </section>
    </section>
  )
}

export default PerformerProfile
