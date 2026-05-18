export type Venue = {
  name: string
  slug: string
  category: string
  location: string
  initials: string
  shortDescription: string
  description: string
  followerCount: number
}

export const venues: Venue[] = [
  {
    name: 'The Backroom Laughs',
    slug: 'the-backroom-laughs',
    category: 'Comedy Club',
    location: 'Philadelphia, PA',
    initials: 'BL',
    shortDescription:
      'A tight comedy room known for weekend showcases and surprise drop-ins.',
    description:
      'The Backroom Laughs is a Philadelphia comedy club with an intimate stage, weekend showcases, and a reputation for surprise drop-ins from comics passing through town.',
    followerCount: 15420,
  },
  {
    name: 'Copper Yard Brewing',
    slug: 'copper-yard-brewing',
    category: 'Brewery & Live Event Space',
    location: 'Asheville, NC',
    initials: 'CY',
    shortDescription:
      'A brewery taproom hosting acoustic sets, comedy nights, and patio events.',
    description:
      'Copper Yard Brewing is an Asheville brewery and live event space hosting acoustic sets, comedy nights, patio markets, and community gatherings around a warm taproom stage.',
    followerCount: 21890,
  },
  {
    name: 'Signal Hall',
    slug: 'signal-hall',
    category: 'Music Venue',
    location: 'Portland, OR',
    initials: 'SH',
    shortDescription:
      'A mid-sized music room built for touring bands and local release shows.',
    description:
      'Signal Hall is a Portland music venue built for touring bands, local release shows, and high-energy bills with strong sound, clean sightlines, and a loyal neighborhood crowd.',
    followerCount: 38670,
  },
  {
    name: 'Civic Garden Stage',
    slug: 'civic-garden-stage',
    category: 'Theater & Festival Space',
    location: 'Santa Fe, NM',
    initials: 'CG',
    shortDescription:
      'An outdoor theater and festival space for concerts, arts nights, and seasonal series.',
    description:
      'Civic Garden Stage is a Santa Fe outdoor theater and festival space used for concerts, arts nights, seasonal series, and community productions under the desert sky.',
    followerCount: 17230,
  },
]

export function findVenueBySlug(slug?: string) {
  return venues.find((venue) => venue.slug === slug)
}

export function formatFollowerCount(count: number) {
  return new Intl.NumberFormat('en-US').format(count)
}
