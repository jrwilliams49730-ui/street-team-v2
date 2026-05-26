import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'
import {
  cleanupGooglePlacesPredictionContainers,
  clearGoogleAutocompleteListeners,
  createPlaceAutocomplete,
  getGoogleMapsDebugState,
  hasGoogleMapsApiKey,
  loadGoogleMaps,
  type ParsedGooglePlace,
} from './googleMaps'

type LocationSearchStatus = {
  type: 'info' | 'success' | 'error'
  text: string
}

type GooglePlacesAutocompleteProps = {
  accountType: string
  initialValue: string
  onPlaceSelected: (place: ParsedGooglePlace) => string | void
}

function GooglePlacesAutocomplete({
  accountType,
  initialValue,
  onPlaceSelected,
}: GooglePlacesAutocompleteProps) {
  const [inputElement, setInputElement] = useState<HTMLInputElement | null>(null)
  const inputElementRef = useRef<HTMLInputElement | null>(null)
  const autocompleteInitializedRef = useRef(false)
  const placeChangedFiredRef = useRef(false)
  const onPlaceSelectedRef = useRef(onPlaceSelected)
  const isGoogleMapsConfigured = hasGoogleMapsApiKey()
  const [locationSearchStatus, setLocationSearchStatus] =
    useState<LocationSearchStatus | null>(() =>
      isGoogleMapsConfigured
        ? null
        : {
            type: 'info',
            text: 'Google Places is unavailable right now. Enter the venue and address manually.',
          },
    )

  useEffect(() => {
    onPlaceSelectedRef.current = onPlaceSelected
  }, [onPlaceSelected])

  useEffect(() => {
    const currentInputElement = inputElementRef.current

    if (
      !currentInputElement ||
      document.activeElement === currentInputElement
    ) {
      return
    }

    currentInputElement.value = initialValue
  }, [initialValue])

  useEffect(() => {
    let autocomplete: unknown = null
    let isMounted = true

    autocompleteInitializedRef.current = false
    placeChangedFiredRef.current = false

    logGooglePlacesAutocompleteState(accountType, 'component binding check', {
      autocompleteInitialized: false,
      inputRefAttached: Boolean(inputElement),
      placeChangedFired: false,
    })

    if (!inputElement) {
      return
    }

    if (!isGoogleMapsConfigured) {
      logGooglePlacesAutocompleteState(accountType, 'api key missing', {
        autocompleteInitialized: false,
        inputRefAttached: true,
        placeChangedFired: false,
      })
      return
    }

    async function initializeAutocomplete() {
      setLocationSearchStatus({
        type: 'info',
        text: 'Loading Google Places...',
      })

      try {
        await loadGoogleMaps()

        if (!isMounted || !inputElement) {
          return
        }

        autocomplete = createPlaceAutocomplete(inputElement, (place) => {
          placeChangedFiredRef.current = true

          const nextDisplayValue = onPlaceSelectedRef.current(place)
          const currentInputElement = inputElementRef.current

          if (typeof nextDisplayValue === 'string' && currentInputElement) {
            currentInputElement.value = nextDisplayValue
          }

          setLocationSearchStatus({
            type: 'success',
            text: 'Location selected from Google Places.',
          })

          logGooglePlacesAutocompleteState(accountType, 'place_changed fired', {
            autocompleteInitialized: autocompleteInitializedRef.current,
            inputRefAttached: true,
            placeChangedFired: true,
            ...getPlacesPredictionDomState(),
          })
        })
        autocompleteInitializedRef.current = true

        logGooglePlacesAutocompleteState(accountType, 'autocomplete ready', {
          autocompleteInitialized: true,
          inputRefAttached: true,
          placeChangedFired: placeChangedFiredRef.current,
          ...getPlacesPredictionDomState(),
        })

        if (isMounted) {
          setLocationSearchStatus({
            type: 'info',
            text: 'Start typing a venue name or street address.',
          })
        }
      } catch (error) {
        cleanupGooglePlacesPredictionContainers()
        autocompleteInitializedRef.current = false

        logGooglePlacesAutocompleteState(accountType, 'autocomplete failed', {
          autocompleteInitialized: false,
          errorMessage: error instanceof Error ? error.message : String(error),
          inputRefAttached: Boolean(inputElement),
          placeChangedFired: placeChangedFiredRef.current,
          ...getPlacesPredictionDomState(),
        })

        if (isMounted) {
          setLocationSearchStatus({
            type: 'error',
            text: getGooglePlacesFailureMessage(),
          })
        }
      }
    }

    void initializeAutocomplete()

    return () => {
      isMounted = false

      if (autocomplete) {
        clearGoogleAutocompleteListeners(autocomplete)
      }

      autocompleteInitializedRef.current = false
      placeChangedFiredRef.current = false
    }
  }, [accountType, inputElement, isGoogleMapsConfigured])

  function handleLocationSearchChange(event: ChangeEvent<HTMLInputElement>) {
    const inputValue = event.target.value

    logGooglePlacesAutocompleteState(accountType, 'location input changed', {
      autocompleteInitialized: autocompleteInitializedRef.current,
      inputLength: inputValue.length,
      inputRefAttached: true,
      placeChangedFired: placeChangedFiredRef.current,
      ...getPlacesPredictionDomState(),
    })

    if (!isGoogleMapsConfigured) {
      return
    }

    setLocationSearchStatus({
      type: 'info',
      text: inputValue.trim()
        ? autocompleteInitializedRef.current
          ? 'Choose a Google Places suggestion or fill out the address fields below.'
          : 'Google Places is still loading. You can keep typing or use the address fields below.'
        : 'Start typing a venue name or street address.',
    })

    if (import.meta.env.DEV && inputValue.trim()) {
      window.setTimeout(() => {
        logGooglePlacesAutocompleteState(
          accountType,
          'prediction dropdown check',
          {
            autocompleteInitialized: autocompleteInitializedRef.current,
            inputLength: inputValue.length,
            inputRefAttached: true,
            placeChangedFired: placeChangedFiredRef.current,
            ...getPlacesPredictionDomState(),
          },
        )
      }, 350)
    }
  }

  const handleLocationInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      inputElementRef.current = node
      setInputElement(node)

      logGooglePlacesAutocompleteState(
        accountType,
        node ? 'input ref attached' : 'input ref detached',
        {
          autocompleteInitialized: autocompleteInitializedRef.current,
          inputRefAttached: Boolean(node),
          placeChangedFired: placeChangedFiredRef.current,
        },
      )
    },
    [accountType],
  )

  const locationHelperText = locationSearchStatus?.text ?? ''
  const locationHelperClassName = locationSearchStatus
    ? `location-autocomplete-helper is-${locationSearchStatus.type}`
    : 'location-autocomplete-helper'

  return (
    <label>
      <span>Find venue or address</span>
      <input
        ref={handleLocationInputRef}
        type="text"
        defaultValue={initialValue}
        autoComplete="off"
        placeholder="Start typing a venue, street address, city, or ZIP"
        onChange={handleLocationSearchChange}
      />
      {locationHelperText ? (
        <small className={locationHelperClassName}>
          {locationHelperText}
        </small>
      ) : null}
    </label>
  )
}

function getGooglePlacesFailureMessage() {
  return hasGoogleMapsApiKey()
    ? 'Google Places could not be loaded. Enter the venue and address manually.'
    : 'Google Places is unavailable right now. Enter the venue and address manually.'
}

function logGooglePlacesAutocompleteState(
  accountType: string,
  message: string,
  extra: Record<string, unknown> = {},
) {
  if (!import.meta.env.DEV) {
    return
  }

  const debugState = getGoogleMapsDebugState()

  console.info('[Street Team Google Places Autocomplete]', message, {
    accountTypeUsingEventForm: accountType,
    apiKeyExists: hasGoogleMapsApiKey(),
    googleMapsPlacesExists: debugState.hasWindowGoogleMapsPlaces,
    sharedGooglePlacesComponentLoaded: true,
    ...extra,
  })
}

function getPlacesPredictionDomState() {
  const predictionContainers = Array.from(
    document.querySelectorAll<HTMLElement>('.pac-container'),
  )
  const visiblePredictionContainers = predictionContainers.filter(
    (container) => {
      const style = window.getComputedStyle(container)

      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0'
      )
    },
  )

  return {
    pacContainerCount: predictionContainers.length,
    pacItemCount: predictionContainers.reduce(
      (total, container) =>
        total + container.querySelectorAll('.pac-item').length,
      0,
    ),
    visiblePacContainerCount: visiblePredictionContainers.length,
  }
}

export default GooglePlacesAutocomplete
