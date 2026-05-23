import { useEffect, useMemo, useState, type FormEvent } from 'react'
import EventCard from './EventCard'
import { geocodeAddress, hasGoogleMapsApiKey } from '../location/googleMaps'
import { fetchUpcomingPublishedEvents, type StreetTeamEvent } from './events'

type DiscoveryCenter = {
  label: string
  latitude: number
  longitude: number
}

type LocationStatus = 'idle' | 'loading' | 'error' | 'ready'

const radiusOptions = [10, 25, 50, 100]

function EventDirectory() {
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

  const eventsWithDistance = useMemo(
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
        : [],
    [center, events],
  )
  const nearbyEvents = useMemo(
    () =>
      eventsWithDistance
        .filter(
          (eventWithDistance) =>
            typeof eventWithDistance.distanceMiles === 'number' &&
            eventWithDistance.distanceMiles <= radiusMiles,
        )
        .sort((firstEvent, secondEvent) => {
          const firstDistance = firstEvent.distanceMiles ?? Number.MAX_VALUE
          const secondDistance = secondEvent.distanceMiles ?? Number.MAX_VALUE

          return firstDistance - secondDistance
        }),
    [eventsWithDistance, radiusMiles],
  )
  const eventsWithoutCoordinates = useMemo(
    () =>
      center
        ? events.filter(
            (event) =>
              typeof event.latitude !== 'number' ||
              typeof event.longitude !== 'number',
          )
        : [],
    [center, events],
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
          label: 'Your location',
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
      setLocationMessage(`Showing events near ${place.formattedAddress || cleanLocationSearch}.`)
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
    <section className="event-directory">
      <header className="section-heading">
        <h2>Events</h2>
        <p>Official Street Team events from producers and venues.</p>
      </header>

      <section className="event-discovery-controls">
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
              Show All Upcoming
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
        <DirectoryStateCard message="Loading events..." />
      ) : null}

      {status === 'error' ? (
        <DirectoryStateCard message="Events could not be loaded." />
      ) : null}

      {status === 'ready' && events.length === 0 ? (
        <DirectoryStateCard message="No published events have been added yet." />
      ) : null}

      {status === 'ready' && events.length > 0 && !center ? (
        <div className="event-grid">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : null}

      {status === 'ready' && events.length > 0 && center ? (
        <div className="event-discovery-results">
          <section className="event-result-group">
            <h3>Nearby Events</h3>
            {nearbyEvents.length === 0 ? (
              <DirectoryStateCard message="No events with coordinates are within this radius." />
            ) : (
              <div className="event-grid">
                {nearbyEvents.map(({ distanceMiles, event }) => (
                  <EventCard
                    key={event.id}
                    distanceMiles={distanceMiles}
                    event={event}
                  />
                ))}
              </div>
            )}
          </section>

          {eventsWithoutCoordinates.length > 0 ? (
            <section className="event-result-group">
              <h3>Upcoming Events Without Coordinates</h3>
              <div className="event-grid">
                {eventsWithoutCoordinates.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          ) : null}
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

export default EventDirectory
