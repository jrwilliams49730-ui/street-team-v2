import type { ParsedGooglePlace } from '../location/googleMaps'
import type { EventFormInput } from './events'

export type EventFormState = EventFormInput

export function getEventFormStateFromGooglePlace(
  currentFormState: EventFormState,
  place: ParsedGooglePlace,
): EventFormState {
  return {
    ...currentFormState,
    addressLine1: place.addressLine1 || currentFormState.addressLine1,
    addressLine2: '',
    city: place.city || currentFormState.city,
    country: place.country || currentFormState.country || 'USA',
    formattedAddress: place.formattedAddress,
    googlePlaceId: place.googlePlaceId,
    latitude: place.latitude,
    longitude: place.longitude,
    postalCode: place.postalCode || currentFormState.postalCode,
    state: place.state || currentFormState.state,
    venueName: place.venueName || currentFormState.venueName,
  }
}

export function clearEventGoogleLocation(input: EventFormState): EventFormState {
  return {
    ...input,
    formattedAddress: '',
    googlePlaceId: '',
    latitude: null,
    longitude: null,
  }
}

export function formatEventLocationSearchDefault(input: EventFormState) {
  return (
    input.formattedAddress ||
    [input.venueName, input.addressLine1, input.city, input.state]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(', ')
  )
}
