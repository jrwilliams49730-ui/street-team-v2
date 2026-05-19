import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ProfileImageAvatar from '../profile-images/ProfileImageAvatar'
import {
  fetchPerformers,
  formatFollowerCount,
  type Performer,
} from './performers'

function PerformerDirectory() {
  const [performers, setPerformers] = useState<Performer[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )

  useEffect(() => {
    let isMounted = true

    async function loadPerformers() {
      try {
        const nextPerformers = await fetchPerformers()

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

    void loadPerformers()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <section className="performer-directory">
      <header className="section-heading">
        <h2>Performers</h2>
        <p>Follow entertainers to keep up with the shows they bring to life.</p>
      </header>

      {status === 'loading' ? (
        <DirectoryStateCard message="Loading performers..." />
      ) : null}

      {status === 'error' ? (
        <DirectoryStateCard message="Performer directory could not load." />
      ) : null}

      {status === 'ready' && performers.length === 0 ? (
        <DirectoryStateCard message="No performers have been added yet." />
      ) : null}

      {status === 'ready' && performers.length > 0 ? (
        <div className="performer-grid">
          {performers.map((performer) => (
            <Link
              key={performer.id}
              to={`/performers/${performer.slug}`}
              className="performer-card"
            >
              <div className="performer-card-header">
                <ProfileImageAvatar
                  className="performer-avatar"
                  imageUrl={performer.imageUrl}
                  initials={performer.initials}
                  name={performer.name}
                />

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

export default PerformerDirectory
