import type {
  SaveEventTicketTypeInput,
  TicketKind,
} from '../events/eventTickets'

export type TicketFormState = {
  description: string
  name: string
  priceDollars: string
  quantityTotal: string
  ticketKind: TicketKind
}

export type ParsedTicketInput =
  | { type: 'success'; input: SaveEventTicketTypeInput }
  | { type: 'error'; message: string }

export const emptyTicketForm: TicketFormState = {
  description: '',
  name: '',
  priceDollars: '',
  quantityTotal: '',
  ticketKind: 'free',
}

export function getTicketInput(
  formState: TicketFormState,
): ParsedTicketInput {
  const quantityTotal = parseTicketQuantity(formState.quantityTotal)

  if (!quantityTotal) {
    return {
      type: 'error',
      message: 'Enter a valid quantity greater than 0.',
    }
  }

  const priceCents =
    formState.ticketKind === 'free'
      ? 0
      : parseTicketPriceCents(formState.priceDollars)

  if (priceCents === null) {
    return {
      type: 'error',
      message: 'Enter a valid paid ticket price greater than $0.00.',
    }
  }

  return {
    input: {
      description: formState.description,
      name: formState.name,
      priceCents,
      quantityTotal,
      ticketKind: formState.ticketKind,
    },
    type: 'success',
  }
}

function parseTicketQuantity(value: string) {
  const trimmed = value.trim()

  if (!/^\d+$/.test(trimmed)) {
    return null
  }

  const quantity = Number.parseInt(trimmed, 10)

  return quantity > 0 ? quantity : null
}

function parseTicketPriceCents(value: string) {
  const normalizedValue = value.trim().replace(/[$,]/g, '')

  if (!/^\d+(\.\d{1,2})?$/.test(normalizedValue)) {
    return null
  }

  const [dollars, cents = ''] = normalizedValue.split('.')
  const priceCents =
    Number.parseInt(dollars, 10) * 100 +
    Number.parseInt(cents.padEnd(2, '0'), 10)

  return priceCents > 0 ? priceCents : null
}
