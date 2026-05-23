type GoogleAddressComponent = {
  long_name: string
  short_name: string
  types: string[]
}

type GoogleLatLng = {
  lat: () => number
  lng: () => number
}

export type GooglePlaceResult = {
  address_components?: GoogleAddressComponent[]
  formatted_address?: string
  geometry?: {
    location?: GoogleLatLng
  }
  name?: string
  place_id?: string
}

type GoogleAutocomplete = {
  addListener: (eventName: 'place_changed', handler: () => void) => unknown
  getPlace: () => GooglePlaceResult
}

type GoogleGeocoderResult = {
  address_components?: GoogleAddressComponent[]
  formatted_address?: string
  geometry?: {
    location?: GoogleLatLng
  }
  place_id?: string
}

type GoogleMapsNamespace = {
  maps: {
    Geocoder: new () => {
      geocode: (
        request: { address: string },
        callback: (
          results: GoogleGeocoderResult[] | null,
          status: string,
        ) => void,
      ) => void
    }
    event: {
      clearInstanceListeners: (instance: unknown) => void
    }
    importLibrary?: (libraryName: string) => Promise<unknown>
    places: {
      Autocomplete: new (
        input: HTMLInputElement,
        options: {
          fields: string[]
        },
      ) => GoogleAutocomplete
    }
  }
}

declare global {
  interface Window {
    gm_authFailure?: () => void
    google?: GoogleMapsNamespace
    streetTeamGoogleMapsPromise?: Promise<GoogleMapsNamespace>
    streetTeamGoogleMapsReady?: () => void
  }
}

export type ParsedGooglePlace = {
  addressLine1: string
  city: string
  country: string
  formattedAddress: string
  googlePlaceId: string
  latitude: number | null
  longitude: number | null
  postalCode: string
  state: string
  venueName: string
}

const googleMapsScriptId = 'street-team-google-maps'
const googleMapsCallbackName = 'streetTeamGoogleMapsReady'
const googleMapsLoadTimeoutMs = 15000

export function hasGoogleMapsApiKey() {
  return Boolean(getGoogleMapsApiKey())
}

export async function loadGoogleMaps() {
  logGoogleMapsLoaderState('load requested')

  if (window.google?.maps?.places) {
    logGoogleMapsLoaderState('already loaded')
    return window.google
  }

  if (window.streetTeamGoogleMapsPromise) {
    logGoogleMapsLoaderState('using existing load promise')
    return window.streetTeamGoogleMapsPromise
  }

  const apiKey = getGoogleMapsApiKey()

  if (!apiKey) {
    logGoogleMapsLoaderState('missing api key')
    throw new Error(
      'Google Places is not configured. Add VITE_GOOGLE_MAPS_API_KEY to .env.local and restart the dev server.',
    )
  }

  window.streetTeamGoogleMapsPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(googleMapsScriptId)
    const previousAuthFailure = window.gm_authFailure
    let isSettled = false
    const loadTimeout = window.setTimeout(() => {
      rejectWithReset(
        new Error(
          'Google Maps script loaded too slowly or did not finish initializing. Check the browser console for Google Maps API errors, key restrictions, billing, and enabled APIs.',
        ),
      )
    }, googleMapsLoadTimeoutMs)

    function cleanup() {
      window.clearTimeout(loadTimeout)

      if (window.gm_authFailure === handleAuthFailure) {
        window.gm_authFailure = previousAuthFailure
      }
    }

    function resolveWithGoogle(google: GoogleMapsNamespace) {
      if (isSettled) {
        return
      }

      isSettled = true
      cleanup()
      logGoogleMapsLoaderState('load succeeded')
      resolve(google)
    }

    function rejectWithReset(error: Error) {
      if (isSettled) {
        return
      }

      isSettled = true
      cleanup()
      window.streetTeamGoogleMapsPromise = undefined
      console.error('[Street Team Google Maps] load failed', {
        errorName: error.name,
        errorMessage: error.message,
        ...getGoogleMapsLoaderState(),
      })
      reject(error)
    }

    async function resolveFromCurrentState(source: string) {
      logGoogleMapsLoaderState('checking current state', { source })

      try {
        const google = await ensureGooglePlacesLibrary()
        resolveWithGoogle(google)
      } catch (error) {
        rejectWithReset(toError(error))
      }
    }

    function tryResolveFromCurrentState(source: string) {
      if (!window.google?.maps) {
        logGoogleMapsLoaderState('current state not ready yet', { source })
        return
      }

      void resolveFromCurrentState(source)
    }

    function handleAuthFailure() {
      logGoogleMapsLoaderState('auth failure')
      previousAuthFailure?.()
      rejectWithReset(
        new Error(
          'Google Maps authentication failed. Check VITE_GOOGLE_MAPS_API_KEY, HTTP referrer restrictions, billing, and enabled APIs.',
        ),
      )
    }

    window.gm_authFailure = handleAuthFailure
    window.streetTeamGoogleMapsReady = () => {
      logGoogleMapsLoaderState('ready callback fired')
      void resolveFromCurrentState('callback')
    }

    if (existingScript) {
      logGoogleMapsLoaderState('script tag already exists')
      existingScript.addEventListener('load', () => {
        logGoogleMapsLoaderState('existing script load event')
        window.setTimeout(
          () => tryResolveFromCurrentState('existing script load fallback'),
          500,
        )
      })
      existingScript.addEventListener('error', (event) => {
        rejectWithReset(createGoogleMapsScriptLoadError(event))
      })
      window.setTimeout(
        () => tryResolveFromCurrentState('existing script immediate check'),
        0,
      )
      return
    }

    const script = document.createElement('script')
    script.id = googleMapsScriptId
    script.async = true
    script.defer = true
    script.src = buildGoogleMapsScriptUrl(apiKey)

    script.addEventListener('load', () => {
      logGoogleMapsLoaderState('script load event')
      window.setTimeout(
        () => tryResolveFromCurrentState('script load fallback'),
        500,
      )
    })
    script.addEventListener('error', (event) => {
      rejectWithReset(createGoogleMapsScriptLoadError(event))
    })

    logGoogleMapsLoaderState('appending script tag', {
      callback: googleMapsCallbackName,
      libraries: 'places',
      version: 'weekly',
    })
    document.head.appendChild(script)
  })

  return window.streetTeamGoogleMapsPromise
}

async function ensureGooglePlacesLibrary() {
  if (!window.google?.maps) {
    throw new Error(
      'Google Maps script loaded, but window.google.maps is unavailable.',
    )
  }

  if (!window.google.maps.places && window.google.maps.importLibrary) {
    logGoogleMapsLoaderState('importing places library')

    try {
      await window.google.maps.importLibrary('places')
      logGoogleMapsLoaderState('places import completed')
    } catch (error) {
      throw new Error(
        `Google Places library import failed: ${formatErrorForMessage(error)}`,
        { cause: error },
      )
    }
  }

  if (!window.google.maps.places) {
    throw new Error(
      'Google Maps loaded, but the Places library is unavailable. Confirm Maps JavaScript API and Places API are enabled and the script includes libraries=places.',
    )
  }

  return window.google
}

function buildGoogleMapsScriptUrl(apiKey: string) {
  const url = new URL('https://maps.googleapis.com/maps/api/js')
  url.searchParams.set('key', apiKey)
  url.searchParams.set('loading', 'async')
  url.searchParams.set('libraries', 'places')
  url.searchParams.set('v', 'weekly')
  url.searchParams.set('callback', googleMapsCallbackName)

  return url.toString()
}

function createGoogleMapsScriptLoadError(event: Event) {
  const eventType = event.type || 'unknown'

  logGoogleMapsLoaderState('script load error', { eventType })

  return new Error(
    `Google Maps script failed to load (${eventType}). Check network access, API key restrictions, billing, and enabled APIs.`,
  )
}

function logGoogleMapsLoaderState(
  message: string,
  extra: Record<string, unknown> = {},
) {
  console.info('[Street Team Google Maps]', message, {
    ...getGoogleMapsLoaderState(),
    ...extra,
  })
}

function getGoogleMapsLoaderState() {
  return {
    hasViteGoogleMapsApiKey: hasGoogleMapsApiKey(),
    hasWindowGoogle: Boolean(window.google),
    hasWindowGoogleMaps: Boolean(window.google?.maps),
    hasWindowGoogleMapsPlaces: Boolean(window.google?.maps?.places),
  }
}

function toError(error: unknown) {
  return error instanceof Error ? error : new Error(formatErrorForMessage(error))
}

function formatErrorForMessage(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`
  }

  return String(error)
}

export async function geocodeAddress(address: string) {
  const cleanAddress = address.trim()

  if (!cleanAddress) {
    return null
  }

  const google = await loadGoogleMaps()
  const geocoder = new google.maps.Geocoder()

  return new Promise<ParsedGooglePlace | null>((resolve, reject) => {
    geocoder.geocode({ address: cleanAddress }, (results, status) => {
      if (status !== 'OK') {
        reject(new Error('Google could not find that location.'))
        return
      }

      const result = results?.[0]

      if (!result) {
        resolve(null)
        return
      }

      resolve(parseGooglePlace(result))
    })
  })
}

export function createPlaceAutocomplete(
  input: HTMLInputElement,
  onPlaceSelected: (place: ParsedGooglePlace) => void,
) {
  if (!window.google?.maps?.places) {
    throw new Error('Google Maps Places library is not loaded.')
  }

  const autocomplete = new window.google.maps.places.Autocomplete(input, {
    fields: [
      'address_components',
      'formatted_address',
      'geometry',
      'name',
      'place_id',
    ],
  })

  autocomplete.addListener('place_changed', () => {
    const parsedPlace = parseGooglePlace(autocomplete.getPlace())

    if (parsedPlace) {
      onPlaceSelected(parsedPlace)
    }
  })

  return autocomplete
}

export function clearGoogleAutocompleteListeners(autocomplete: unknown) {
  window.google?.maps.event.clearInstanceListeners(autocomplete)
}

export function parseGooglePlace(
  place: GooglePlaceResult | GoogleGeocoderResult,
): ParsedGooglePlace | null {
  const location = place.geometry?.location
  const addressComponents = place.address_components ?? []
  const streetNumber = getAddressComponent(addressComponents, 'street_number')
  const route = getAddressComponent(addressComponents, 'route')
  const city =
    getAddressComponent(addressComponents, 'locality') ||
    getAddressComponent(addressComponents, 'postal_town') ||
    getAddressComponent(addressComponents, 'sublocality') ||
    getAddressComponent(addressComponents, 'administrative_area_level_2')
  const state = getAddressComponent(
    addressComponents,
    'administrative_area_level_1',
    'short',
  )
  const postalCode = getAddressComponent(addressComponents, 'postal_code')
  const country =
    getAddressComponent(addressComponents, 'country', 'short') ||
    getAddressComponent(addressComponents, 'country')
  const addressLine1 = [streetNumber, route].filter(Boolean).join(' ')

  if (!location && !place.formatted_address) {
    return null
  }

  return {
    addressLine1,
    city,
    country,
    formattedAddress: place.formatted_address?.trim() ?? '',
    googlePlaceId: place.place_id?.trim() ?? '',
    latitude: location?.lat() ?? null,
    longitude: location?.lng() ?? null,
    postalCode,
    state,
    venueName: 'name' in place ? place.name?.trim() ?? '' : '',
  }
}

function getGoogleMapsApiKey() {
  return import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined
}

function getAddressComponent(
  addressComponents: GoogleAddressComponent[],
  type: string,
  nameType: 'long' | 'short' = 'long',
) {
  const component = addressComponents.find((addressComponent) =>
    addressComponent.types.includes(type),
  )

  if (!component) {
    return ''
  }

  return nameType === 'short' ? component.short_name : component.long_name
}
