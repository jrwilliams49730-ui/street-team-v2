import {
  fetchEventsByIds,
  type StreetTeamEvent,
} from '../events/events'
import {
  fetchEventTicketTypesByIds,
  fetchTicketReservationsForUser,
  type EventTicketType,
  type TicketReservation,
} from '../events/eventTickets'

export type MyTicket = {
  event: StreetTeamEvent | null
  reservation: TicketReservation
  ticketType: EventTicketType | null
}

export async function fetchMyTickets(userId: string) {
  const reservations = await fetchTicketReservationsForUser(userId)

  if (reservations.length === 0) {
    return []
  }

  const [events, ticketTypes] = await Promise.all([
    fetchEventsByIds(reservations.map((reservation) => reservation.eventId)),
    fetchEventTicketTypesByIds(
      reservations.map((reservation) => reservation.ticketTypeId),
    ),
  ])

  const eventsById = new Map(events.map((event) => [event.id, event]))
  const ticketTypesById = new Map(
    ticketTypes.map((ticketType) => [ticketType.id, ticketType]),
  )

  return reservations
    .map((reservation) => ({
      event: eventsById.get(reservation.eventId) ?? null,
      reservation,
      ticketType: ticketTypesById.get(reservation.ticketTypeId) ?? null,
    }))
    .sort(sortMyTickets)
}

function sortMyTickets(firstTicket: MyTicket, secondTicket: MyTicket) {
  const firstDate = firstTicket.event?.eventDate ?? '9999-12-31'
  const secondDate = secondTicket.event?.eventDate ?? '9999-12-31'

  if (firstDate !== secondDate) {
    return firstDate.localeCompare(secondDate)
  }

  const firstTime = firstTicket.event?.startTime ?? '99:99'
  const secondTime = secondTicket.event?.startTime ?? '99:99'

  if (firstTime !== secondTime) {
    return firstTime.localeCompare(secondTime)
  }

  return firstTicket.reservation.createdAt.localeCompare(
    secondTicket.reservation.createdAt,
  )
}
