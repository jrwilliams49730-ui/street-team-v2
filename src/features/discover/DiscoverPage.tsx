import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  fetchUpcomingPublishedEvents,
  formatEventDate,
  formatEventLocation,
  formatEventTime,
  type StreetTeamEvent,
} from '../events/events'
import { formatFollowerLabel } from '../follows/follows'
import ProfileImageAvatar from '../profile-images/ProfileImageAvatar'
import {
  fetchPerformers,
  type Performer,
} from '../performers/performers'
import { fetchProducers, type Producer } from '../producers/producers'
import { fetchVenues, type Venue } from '../venues/venues'

type DiscoverSearchResult = {
  detail: string
  id: string
  searchText: string
  title: string
  to: string
  type: 'Event' | 'Performer' | 'Producer' | 'Venue'
}

function DiscoverBrowseSection() {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<DiscoverSearchResult[]>(
    [],
  )
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )

  useEffect(() => {
    let isMounted = true

    async function loadSearchData() {
      setStatus('loading')

      try {
        const [events, performers, producers, venues] = await Promise.all([
          fetchUpcomingPublishedEvents(),
          fetchPerformers(),
          fetchProducers(),
          fetchVenues(),
        ])

        if (isMounted) {
          setSearchResults([
            ...events.map(mapEventToSearchResult),
            ...performers.map(mapPerformerToSearchResult),
            ...producers.map(mapProducerToSearchResult),
            ...venues.map(mapVenueToSearchResult),
          ])
          setStatus('ready')
        }
      } catch {
        if (isMounted) {
          setStatus('error')
        }
      }
    }

    void loadSearchData()

    return () => {
      isMounted = false
    }
  }, [])

  const filteredResults = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    if (!query) {
      return []
    }

    return searchResults
      .filter((result) => result.searchText.includes(query))
      .slice(0, 8)
  }, [searchResults, searchTerm])

  return (
    <section className="discover-browse-section">
      <header className="featured-section-header">
        <h3>Browse Street Team</h3>
      </header>

      <div className="discover-browse-grid">
        <DiscoverBrowseCard
          detail="Upcoming shows, radius search, and ticket options."
          label="Events"
          to="/events"
        />
        <DiscoverBrowseCard
          detail="Artists, comedians, DJs, hosts, and featured media."
          label="Performers"
          to="/performers"
        />
        <DiscoverBrowseCard
          detail="Rooms, clubs, theaters, and event spaces."
          label="Venues"
          to="/venues"
        />
        <DiscoverBrowseCard
          detail="Promoters, collectives, and event producers."
          label="Producers"
          to="/producers"
        />
      </div>

      <label className="discover-search-field">
        <span>Search events, performers, venues, or producers</span>
        <input
          type="search"
          value={searchTerm}
          placeholder="Search Street Team"
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </label>

      {status === 'loading' && searchTerm.trim() ? (
        <p className="featured-empty-state">Loading search...</p>
      ) : null}

      {status === 'error' && searchTerm.trim() ? (
        <p className="featured-empty-state">Search could not load.</p>
      ) : null}

      {status === 'ready' && searchTerm.trim() && filteredResults.length === 0 ? (
        <p className="featured-empty-state">No matches found.</p>
      ) : null}

      {filteredResults.length > 0 ? (
        <div className="discover-search-results">
          {filteredResults.map((result) => (
            <Link
              key={`${result.type}-${result.id}`}
              to={result.to}
              className="discover-search-result"
            >
              <span>{result.type}</span>
              <strong>{result.title}</strong>
              <p>{result.detail}</p>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function DiscoverBrowseCard({
  detail,
  label,
  to,
}: {
  detail: string
  label: string
  to: string
}) {
  return (
    <Link to={to} className="discover-browse-card">
      <strong>{label}</strong>
      <p>{detail}</p>
    </Link>
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
              <ProfileImageAvatar
                className="featured-avatar is-producer"
                imageUrl={producer.imageUrl}
                initials={producer.initials}
                name={producer.name}
              />

              <div className="featured-card-copy">
                <h4>{producer.name}</h4>
                <p>
                  {producer.category} | {producer.location}
                </p>
                <span>{formatFollowerLabel(producer.followerCount)}</span>
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
              <ProfileImageAvatar
                className="featured-avatar is-performer"
                imageUrl={performer.imageUrl}
                initials={performer.initials}
                name={performer.name}
              />

              <div className="featured-card-copy">
                <h4>{performer.name}</h4>
                <p>
                  {performer.category} | {performer.location}
                </p>
                <span>{formatFollowerLabel(performer.followerCount)}</span>
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

function FeaturedVenuesSection() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )

  useEffect(() => {
    let isMounted = true

    async function loadFeaturedVenues() {
      try {
        const nextVenues = await fetchVenues(3)

        if (isMounted) {
          setVenues(nextVenues)
          setStatus('ready')
        }
      } catch {
        if (isMounted) {
          setStatus('error')
        }
      }
    }

    void loadFeaturedVenues()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <section className="featured-section">
      <div className="featured-section-header">
        <h3>Featured venues</h3>
      </div>

      {status === 'loading' ? (
        <p className="featured-empty-state">Loading featured venues...</p>
      ) : null}

      {status === 'error' ? (
        <p className="featured-empty-state">Featured venues could not load.</p>
      ) : null}

      {status === 'ready' && venues.length === 0 ? (
        <p className="featured-empty-state">
          Featured venues will appear here once profiles are created.
        </p>
      ) : null}

      {status === 'ready' && venues.length > 0 ? (
        <div className="featured-grid">
          {venues.map((venue) => (
            <Link
              key={venue.id}
              to={`/venues/${venue.slug}`}
              className="featured-card"
            >
              <ProfileImageAvatar
                className="featured-avatar is-venue"
                imageUrl={venue.imageUrl}
                initials={venue.initials}
                name={venue.name}
              />

              <div className="featured-card-copy">
                <h4>{venue.name}</h4>
                <p>
                  {venue.category} | {venue.location}
                </p>
                <span>{formatFollowerLabel(venue.followerCount)}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : null}

      <Link to="/venues" className="view-all-link">
        View all venues
      </Link>
    </section>
  )
}

function UpcomingEventsSection() {
  const [events, setEvents] = useState<StreetTeamEvent[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )

  useEffect(() => {
    let isMounted = true

    async function loadUpcomingEvents() {
      try {
        const nextEvents = await fetchUpcomingPublishedEvents(3)

        if (isMounted) {
          setEvents(nextEvents)
          setStatus('ready')
        }
      } catch {
        if (isMounted) {
          setStatus('error')
        }
      }
    }

    void loadUpcomingEvents()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <section className="featured-section">
      <div className="featured-section-header">
        <h3>Upcoming Events</h3>
      </div>

      {status === 'loading' ? (
        <p className="featured-empty-state">Loading upcoming events...</p>
      ) : null}

      {status === 'error' ? (
        <p className="featured-empty-state">Upcoming events could not load.</p>
      ) : null}

      {status === 'ready' && events.length === 0 ? (
        <p className="featured-empty-state">No upcoming events posted yet.</p>
      ) : null}

      {status === 'ready' && events.length > 0 ? (
        <div className="featured-grid">
          {events.map((event) => {
            const location = formatEventLocation(event)

            return (
              <Link
                key={event.id}
                to={`/events/${event.slug}`}
                className="featured-card featured-event-card"
              >
                {event.eventImageUrl ? (
                  <div className="featured-event-image-frame">
                    <img
                      src={event.eventImageUrl}
                      alt=""
                      className="featured-event-image"
                      loading="lazy"
                    />
                  </div>
                ) : null}

                <div className="featured-card-copy">
                  <h4>{event.title}</h4>
                  <p>
                    {formatEventDate(event.eventDate)}
                    {event.startTime
                      ? ` at ${formatEventTime(event.startTime)}`
                      : ''}
                  </p>
                  <p>{event.venueName}</p>
                  {location ? <span>{location}</span> : null}
                </div>
              </Link>
            )
          })}
        </div>
      ) : null}

      <Link to="/events" className="view-all-link">
        View all events
      </Link>
    </section>
  )
}

function mapEventToSearchResult(event: StreetTeamEvent): DiscoverSearchResult {
  const location = formatEventLocation(event)
  const detailParts = [
    formatEventDate(event.eventDate),
    event.venueName,
    location,
  ].filter(Boolean)

  return {
    detail: detailParts.join(' | '),
    id: event.id,
    searchText: formatSearchText([
      event.title,
      event.category,
      event.venueName,
      event.city,
      event.state,
      location,
    ]),
    title: event.title,
    to: `/events/${event.slug}`,
    type: 'Event',
  }
}

function mapPerformerToSearchResult(
  performer: Performer,
): DiscoverSearchResult {
  return {
    detail: [performer.category, performer.location].filter(Boolean).join(' | '),
    id: performer.id,
    searchText: formatSearchText([
      performer.name,
      performer.category,
      performer.location,
      performer.shortBio,
    ]),
    title: performer.name,
    to: `/performers/${performer.slug}`,
    type: 'Performer',
  }
}

function mapProducerToSearchResult(producer: Producer): DiscoverSearchResult {
  return {
    detail: [producer.category, producer.location].filter(Boolean).join(' | '),
    id: producer.id,
    searchText: formatSearchText([
      producer.name,
      producer.category,
      producer.location,
      producer.shortBio,
    ]),
    title: producer.name,
    to: `/producers/${producer.slug}`,
    type: 'Producer',
  }
}

function mapVenueToSearchResult(venue: Venue): DiscoverSearchResult {
  return {
    detail: [venue.category, venue.location].filter(Boolean).join(' | '),
    id: venue.id,
    searchText: formatSearchText([
      venue.name,
      venue.category,
      venue.location,
      venue.shortDescription,
    ]),
    title: venue.name,
    to: `/venues/${venue.slug}`,
    type: 'Venue',
  }
}

function formatSearchText(parts: string[]) {
  return parts.join(' ').toLowerCase()
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

      <DiscoverBrowseSection />
      <FeaturedPerformersSection />
      <UpcomingEventsSection />
      <FeaturedProducersSection />
      <FeaturedVenuesSection />
    </section>
  )
}

export default DiscoverPage
