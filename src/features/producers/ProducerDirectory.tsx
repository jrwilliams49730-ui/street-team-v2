import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatFollowerLabel } from '../follows/follows'
import ProfileImageAvatar from '../profile-images/ProfileImageAvatar'
import { fetchProducers, type Producer } from './producers'

function ProducerDirectory() {
  const [producers, setProducers] = useState<Producer[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )

  useEffect(() => {
    let isMounted = true

    async function loadProducers() {
      try {
        const nextProducers = await fetchProducers()

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

    void loadProducers()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <section className="producer-directory">
      <header className="section-heading">
        <h2>Producers</h2>
        <p>
          Follow the people and teams creating live events worth showing up for.
        </p>
      </header>

      {status === 'loading' ? (
        <DirectoryStateCard message="Loading producers..." />
      ) : null}

      {status === 'error' ? (
        <DirectoryStateCard message="Producer directory could not load." />
      ) : null}

      {status === 'ready' && producers.length === 0 ? (
        <DirectoryStateCard message="No producers have been added yet." />
      ) : null}

      {status === 'ready' && producers.length > 0 ? (
        <div className="producer-grid">
          {producers.map((producer) => (
            <Link
              key={producer.id}
              to={`/producers/${producer.slug}`}
              className="producer-card"
            >
              <div className="producer-card-header">
                <ProfileImageAvatar
                  className="producer-avatar"
                  imageUrl={producer.imageUrl}
                  initials={producer.initials}
                  name={producer.name}
                />

                <div>
                  <h3>{producer.name}</h3>
                  <p>
                    {producer.category} | {producer.location}
                  </p>
                </div>
              </div>

              <p className="producer-bio">{producer.shortBio}</p>
              <span className="follower-count">
                {formatFollowerLabel(producer.followerCount)}
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

export default ProducerDirectory
