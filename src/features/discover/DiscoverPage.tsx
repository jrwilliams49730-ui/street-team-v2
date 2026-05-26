import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import EventCard from '../events/EventCard'
import {
  fetchUpcomingPublishedEvents,
  formatEventDate,
  formatEventLocation,
  formatEventTime,
  type StreetTeamEvent,
} from '../events/events'
import { formatFollowerLabel } from '../follows/follows'
import { geocodeAddress, hasGoogleMapsApiKey } from '../location/googleMaps'
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

type FeaturedItem = {
  avatarClassName?: string
  detail: string
  id: string
  imageUrl?: string | null
  initials?: string
  label: string
  meta: string
  nameForAvatar?: string
  title: string
  to: string
  variant: 'event' | 'profile'
}

type ProfilePreviewItem = {
  avatarClassName: string
  detail: string
  id: string
  imageUrl: string | null
  initials: string
  label: string
  meta: string
  name: string
  to: string
}

type DiscoveryCenter = {
  label: string
  latitude: number
  longitude: number
}

type LocationStatus = 'idle' | 'loading' | 'error' | 'ready'

const radiusOptions = [10, 25, 50, 100]

function FeaturedSection() {
  const [items, setItems] = useState<FeaturedItem[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )

  useEffect(() => {
    let isMounted = true

    async function loadFeaturedContent() {
      setStatus('loading')

      try {
        const [events, performers, venues, producers] = await Promise.all([
          fetchUpcomingPublishedEvents(2),
          fetchPerformers(1),
          fetchVenues(1),
          fetchProducers(1),
        ])

        if (!isMounted) {
          return
        }

        setItems(
          [
            ...events.map(mapEventToFeaturedItem),
            ...performers.map(mapPerformerToFeaturedItem),
            ...venues.map(mapVenueToFeaturedItem),
            ...producers.map(mapProducerToFeaturedItem),
          ].slice(0, 4),
        )
        setStatus('ready')
      } catch {
        if (isMounted) {
          setStatus('error')
        }
      }
    }

    void loadFeaturedContent()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <section className="featured-section discover-featured-section">
      <header className="featured-section-header discover-section-heading">
        <div>
          <h3>Featured</h3>
          <p>Highlighted shows, creators, and places from the network.</p>
        </div>
      </header>

      {status === 'loading' ? (
        <p className="featured-empty-state">Loading featured picks...</p>
      ) : null}

      {status === 'error' ? (
        <p className="featured-empty-state">Featured picks could not load.</p>
      ) : null}

      {status === 'ready' && items.length === 0 ? (
        <p className="featured-empty-state">
          Featured events, performers, venues, and producers will appear here as
          Round 1 content is added.
        </p>
      ) : null}

      {status === 'ready' && items.length > 0 ? (
        <div className="featured-grid discover-featured-grid">
          {items.map((item) => (
            <FeaturedContentCard item={item} key={item.id} />
          ))}
        </div>
      ) : null}
    </section>
  )
}

function FeaturedContentCard({ item }: { item: FeaturedItem }) {
  if (item.variant === 'event') {
    return (
      <Link
        to={item.to}
        className="featured-card featured-event-card discover-featured-card"
      >
        {item.imageUrl ? (
          <div className="featured-event-image-frame">
            <img
              src={item.imageUrl}
              alt=""
              className="featured-event-image"
              loading="lazy"
            />
          </div>
        ) : null}

        <div className="featured-card-copy">
          <span className="discover-card-label">{item.label}</span>
          <h4>{item.title}</h4>
          <p>{item.detail}</p>
          {item.meta ? <span>{item.meta}</span> : null}
        </div>
      </Link>
    )
  }

  return (
    <Link to={item.to} className="featured-card discover-featured-card">
      <ProfileImageAvatar
        className={`featured-avatar ${item.avatarClassName ?? ''}`.trim()}
        imageUrl={item.imageUrl ?? null}
        initials={item.initials ?? ''}
        name={item.nameForAvatar ?? item.title}
      />

      <div className="featured-card-copy">
        <span className="discover-card-label">{item.label}</span>
        <h4>{item.title}</h4>
        <p>{item.detail}</p>
        {item.meta ? <span>{item.meta}</span> : null}
      </div>
    </Link>
  )
}

function NearYouSection() {
  const [events, setEvents] = useState<StreetTeamEvent[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [center, setCenter] = useState<DiscoveryCenter | null>(null)
  const [locationSearch, setLocationSearch] = useState('')
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle')
  const [locationMessage, setLocationMessage] = useState('')
  const [radiusMiles, setRadiusMiles] = useState(25)

  useEffect(() => {
    let isMounted = true

    async function loadEvents() {
      setStatus('loading')

      try {
        const nextEvents = await fetchUpcomingPublishedEvents()

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

    void loadEvents()

    return () => {
      isMounted = false
    }
  }, [])

  const nearbyEvents = useMemo(
    () =>
      center
        ? events
            .map((event) => {
              const distanceMiles =
                typeof event.latitude === 'number' &&
                typeof event.longitude === 'number'
                  ? calculateDistanceMiles(
                      center.latitude,
                      center.longitude,
                      event.latitude,
                      event.longitude,
                    )
                  : null

              return {
                distanceMiles,
                event,
              }
            })
            .filter(
              (eventWithDistance) =>
                typeof eventWithDistance.distanceMiles === 'number' &&
                eventWithDistance.distanceMiles <= radiusMiles,
            )
            .sort((firstEvent, secondEvent) => {
              const firstDistance = firstEvent.distanceMiles ?? Number.MAX_VALUE
              const secondDistance =
                secondEvent.distanceMiles ?? Number.MAX_VALUE

              return firstDistance - secondDistance
            })
            .slice(0, 3)
        : [],
    [center, events, radiusMiles],
  )

  function handleUseDeviceLocation() {
    if (!navigator.geolocation) {
      setLocationStatus('error')
      setLocationMessage(
        'Browser location is not available. Search by city or ZIP instead.',
      )
      return
    }

    setLocationStatus('loading')
    setLocationMessage('Requesting your location...')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenter({
          label: 'your location',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setLocationStatus('ready')
        setLocationMessage('Showing events near your location.')
      },
      (error) => {
        setCenter(null)
        setLocationStatus('error')
        setLocationMessage(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission was denied. Search by city or ZIP instead.'
            : 'Your location could not be detected. Search by city or ZIP instead.',
        )
      },
      {
        enableHighAccuracy: false,
        maximumAge: 5 * 60 * 1000,
        timeout: 10000,
      },
    )
  }

  async function handleLocationSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const cleanLocationSearch = locationSearch.trim()

    if (!cleanLocationSearch) {
      setLocationStatus('error')
      setLocationMessage('Enter a city or ZIP code before searching nearby.')
      return
    }

    if (!hasGoogleMapsApiKey()) {
      setLocationStatus('error')
      setLocationMessage(
        'Google Maps is not configured, so location search is unavailable.',
      )
      return
    }

    setLocationStatus('loading')
    setLocationMessage('Finding that location...')

    try {
      const place = await geocodeAddress(cleanLocationSearch)

      if (
        typeof place?.latitude !== 'number' ||
        typeof place.longitude !== 'number'
      ) {
        setLocationStatus('error')
        setLocationMessage('Google could not find that city or ZIP code.')
        return
      }

      setCenter({
        label: place.formattedAddress || cleanLocationSearch,
        latitude: place.latitude,
        longitude: place.longitude,
      })
      setLocationStatus('ready')
      setLocationMessage(
        `Showing events near ${place.formattedAddress || cleanLocationSearch}.`,
      )
    } catch (error) {
      setCenter(null)
      setLocationStatus('error')
      setLocationMessage(
        error instanceof Error
          ? error.message
          : 'Google could not find that city or ZIP code.',
      )
    }
  }

  function clearNearbyFilter() {
    setCenter(null)
    setLocationMessage('')
    setLocationSearch('')
    setLocationStatus('idle')
  }

  return (
    <section className="featured-section discover-nearby-section">
      <header className="featured-section-header discover-section-heading">
        <div>
          <h3>Near You</h3>
          <p>Use the same radius search from Events to find nearby shows.</p>
        </div>
        <Link to="/app/events" className="view-all-link">
          Open Events
        </Link>
      </header>

      <section className="event-discovery-controls discover-nearby-controls">
        <div className="event-radius-field">
          <label>
            <span>Radius</span>
            <select
              value={radiusMiles}
              onChange={(event) => setRadiusMiles(Number(event.target.value))}
            >
              {radiusOptions.map((radiusOption) => (
                <option key={radiusOption} value={radiusOption}>
                  {radiusOption} miles
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="secondary-action-button"
            onClick={handleUseDeviceLocation}
          >
            Use My Location
          </button>
        </div>

        <form
          className="event-location-search-form"
          onSubmit={handleLocationSearchSubmit}
        >
          <label>
            <span>Search by city or ZIP</span>
            <input
              type="text"
              value={locationSearch}
              placeholder="Austin, TX or 78701"
              onChange={(event) => setLocationSearch(event.target.value)}
            />
          </label>

          <button type="submit" className="auth-submit-button">
            Search Nearby
          </button>
        </form>

        {center ? (
          <div className="event-location-filter-summary">
            <p>
              Showing events within {radiusMiles} miles of {center.label}.
            </p>
            <button
              type="button"
              className="secondary-action-button"
              onClick={clearNearbyFilter}
            >
              Clear Location
            </button>
          </div>
        ) : null}

        {locationMessage ? (
          <p className={`event-location-message is-${locationStatus}`}>
            {locationMessage}
          </p>
        ) : null}
      </section>

      {status === 'loading' ? (
        <p className="featured-empty-state">Loading nearby event options...</p>
      ) : null}

      {status === 'error' ? (
        <p className="featured-empty-state">Nearby events could not load.</p>
      ) : null}

      {status === 'ready' && !center ? (
        <p className="featured-empty-state">
          Choose a location to see published events inside your radius.
        </p>
      ) : null}

      {status === 'ready' && center && nearbyEvents.length === 0 ? (
        <p className="featured-empty-state">
          No events with coordinates are within this radius yet.
        </p>
      ) : null}

      {status === 'ready' && nearbyEvents.length > 0 ? (
        <div className="event-grid discover-nearby-grid">
          {nearbyEvents.map(({ distanceMiles, event }) => (
            <EventCard
              key={event.id}
              distanceMiles={distanceMiles}
              event={event}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
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
      <header className="featured-section-header discover-section-heading">
        <div>
          <h3>Browse Categories</h3>
          <p>Jump into the main paths through Street Team.</p>
        </div>
      </header>

      <div className="discover-browse-grid">
        <DiscoverBrowseCard
          detail="Upcoming shows, radius search, and ticket options."
          label="Events"
          to="/app/events"
        />
        <DiscoverBrowseCard
          detail="Artists, comedians, DJs, hosts, and featured media."
          label="Performers"
          to="/app/performers"
        />
        <DiscoverBrowseCard
          detail="Rooms, clubs, theaters, and event spaces."
          label="Venues"
          to="/app/venues"
        />
        <DiscoverBrowseCard
          detail="Promoters, collectives, and event producers."
          label="Producers"
          to="/app/producers"
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

function RecentlyAddedSection() {
  const [events, setEvents] = useState<StreetTeamEvent[]>([])
  const [profiles, setProfiles] = useState<ProfilePreviewItem[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )

  useEffect(() => {
    let isMounted = true

    async function loadRecentContent() {
      setStatus('loading')

      try {
        const [nextEvents, performers, producers, venues] = await Promise.all([
          fetchUpcomingPublishedEvents(4),
          fetchPerformers(2),
          fetchProducers(2),
          fetchVenues(2),
        ])

        if (!isMounted) {
          return
        }

        setEvents(nextEvents)
        setProfiles([
          ...performers.map(mapPerformerToProfilePreview),
          ...venues.map(mapVenueToProfilePreview),
          ...producers.map(mapProducerToProfilePreview),
        ].slice(0, 6))
        setStatus('ready')
      } catch {
        if (isMounted) {
          setStatus('error')
        }
      }
    }

    void loadRecentContent()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <section className="featured-section discover-recent-section">
      <header className="featured-section-header discover-section-heading">
        <div>
          <h3>Recently Added / Upcoming</h3>
          <p>Fresh event listings and newly added public profiles.</p>
        </div>
      </header>

      {status === 'loading' ? (
        <p className="featured-empty-state">Loading recent activity...</p>
      ) : null}

      {status === 'error' ? (
        <p className="featured-empty-state">Recent activity could not load.</p>
      ) : null}

      {status === 'ready' && events.length === 0 && profiles.length === 0 ? (
        <p className="featured-empty-state">
          Upcoming events and newly added profiles will appear here.
        </p>
      ) : null}

      {status === 'ready' && events.length > 0 ? (
        <div className="discover-subsection">
          <div className="discover-subsection-heading">
            <h4>Upcoming events</h4>
            <Link to="/app/events" className="view-all-link">
              View all events
            </Link>
          </div>

          <div className="featured-grid">
            {events.map((event) => (
              <FeaturedContentCard
                key={event.id}
                item={mapEventToFeaturedItem(event)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {status === 'ready' && profiles.length > 0 ? (
        <div className="discover-subsection">
          <div className="discover-subsection-heading">
            <h4>Recently added profiles</h4>
          </div>

          <div className="featured-grid">
            {profiles.map((profile) => (
              <ProfilePreviewCard key={profile.id} profile={profile} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}

function ProfilePreviewCard({ profile }: { profile: ProfilePreviewItem }) {
  return (
    <Link to={profile.to} className="featured-card discover-profile-card">
      <ProfileImageAvatar
        className={`featured-avatar ${profile.avatarClassName}`}
        imageUrl={profile.imageUrl}
        initials={profile.initials}
        name={profile.name}
      />

      <div className="featured-card-copy">
        <span className="discover-card-label">{profile.label}</span>
        <h4>{profile.name}</h4>
        <p>{profile.detail}</p>
        <span>{profile.meta}</span>
      </div>
    </Link>
  )
}

function mapEventToFeaturedItem(event: StreetTeamEvent): FeaturedItem {
  const location = formatEventLocation(event)

  return {
    detail: formatEventTiming(event),
    id: `event-${event.id}`,
    imageUrl: event.eventImageUrl,
    label: 'Featured event',
    meta: [event.venueName, location].filter(Boolean).join(' | '),
    title: event.title,
    to: `/app/events/${event.slug}`,
    variant: 'event',
  }
}

function mapPerformerToFeaturedItem(performer: Performer): FeaturedItem {
  return {
    avatarClassName: 'is-performer',
    detail: [performer.category, performer.location].filter(Boolean).join(' | '),
    id: `performer-${performer.id}`,
    imageUrl: performer.imageUrl,
    initials: performer.initials,
    label: 'Highlighted performer',
    meta: formatFollowerLabel(performer.followerCount),
    nameForAvatar: performer.name,
    title: performer.name,
    to: `/app/performers/${performer.slug}`,
    variant: 'profile',
  }
}

function mapProducerToFeaturedItem(producer: Producer): FeaturedItem {
  return {
    avatarClassName: 'is-producer',
    detail: [producer.category, producer.location].filter(Boolean).join(' | '),
    id: `producer-${producer.id}`,
    imageUrl: producer.imageUrl,
    initials: producer.initials,
    label: 'Highlighted producer',
    meta: formatFollowerLabel(producer.followerCount),
    nameForAvatar: producer.name,
    title: producer.name,
    to: `/app/producers/${producer.slug}`,
    variant: 'profile',
  }
}

function mapVenueToFeaturedItem(venue: Venue): FeaturedItem {
  return {
    avatarClassName: 'is-venue',
    detail: [venue.category, venue.location].filter(Boolean).join(' | '),
    id: `venue-${venue.id}`,
    imageUrl: venue.imageUrl,
    initials: venue.initials,
    label: 'Highlighted venue',
    meta: formatFollowerLabel(venue.followerCount),
    nameForAvatar: venue.name,
    title: venue.name,
    to: `/app/venues/${venue.slug}`,
    variant: 'profile',
  }
}

function mapPerformerToProfilePreview(
  performer: Performer,
): ProfilePreviewItem {
  return {
    avatarClassName: 'is-performer',
    detail: [performer.category, performer.location].filter(Boolean).join(' | '),
    id: `performer-${performer.id}`,
    imageUrl: performer.imageUrl,
    initials: performer.initials,
    label: 'Performer',
    meta: formatFollowerLabel(performer.followerCount),
    name: performer.name,
    to: `/app/performers/${performer.slug}`,
  }
}

function mapProducerToProfilePreview(producer: Producer): ProfilePreviewItem {
  return {
    avatarClassName: 'is-producer',
    detail: [producer.category, producer.location].filter(Boolean).join(' | '),
    id: `producer-${producer.id}`,
    imageUrl: producer.imageUrl,
    initials: producer.initials,
    label: 'Producer',
    meta: formatFollowerLabel(producer.followerCount),
    name: producer.name,
    to: `/app/producers/${producer.slug}`,
  }
}

function mapVenueToProfilePreview(venue: Venue): ProfilePreviewItem {
  return {
    avatarClassName: 'is-venue',
    detail: [venue.category, venue.location].filter(Boolean).join(' | '),
    id: `venue-${venue.id}`,
    imageUrl: venue.imageUrl,
    initials: venue.initials,
    label: 'Venue',
    meta: formatFollowerLabel(venue.followerCount),
    name: venue.name,
    to: `/app/venues/${venue.slug}`,
  }
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
    to: `/app/events/${event.slug}`,
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
    to: `/app/performers/${performer.slug}`,
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
    to: `/app/producers/${producer.slug}`,
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
    to: `/app/venues/${venue.slug}`,
    type: 'Venue',
  }
}

function formatEventTiming(event: StreetTeamEvent) {
  return `${formatEventDate(event.eventDate)}${
    event.startTime ? ` at ${formatEventTime(event.startTime)}` : ''
  }`
}

function formatSearchText(parts: string[]) {
  return parts.join(' ').toLowerCase()
}

function calculateDistanceMiles(
  firstLatitude: number,
  firstLongitude: number,
  secondLatitude: number,
  secondLongitude: number,
) {
  const earthRadiusMiles = 3958.8
  const latitudeDelta = toRadians(secondLatitude - firstLatitude)
  const longitudeDelta = toRadians(secondLongitude - firstLongitude)
  const firstLatitudeRadians = toRadians(firstLatitude)
  const secondLatitudeRadians = toRadians(secondLatitude)
  const haversine =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(firstLatitudeRadians) *
      Math.cos(secondLatitudeRadians) *
      Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2)
  const angularDistance =
    2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))

  return earthRadiusMiles * angularDistance
}

function toRadians(value: number) {
  return (value * Math.PI) / 180
}

function DiscoverPage() {
  return (
    <section className="discover-page">
      <header className="discover-hero">
        <p className="eyebrow">Street Team Network</p>
        <h2>Discover the live scene</h2>
        <p>
          Find featured shows, nearby events, and public profiles worth
          following so the next great night is already on your radar.
        </p>
      </header>

      <FeaturedSection />
      <NearYouSection />
      <DiscoverBrowseSection />
      <RecentlyAddedSection />
    </section>
  )
}

export default DiscoverPage
