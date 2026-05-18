export type Producer = {
  name: string
  slug: string
  category: string
  location: string
  initials: string
  shortBio: string
  bio: string
  followerCount: number
}

export const producers: Producer[] = [
  {
    name: 'Laugh Track Collective',
    slug: 'laugh-track-collective',
    category: 'Independent Comedy Producer',
    location: 'Denver, CO',
    initials: 'LC',
    shortBio:
      'A rotating comedy night crew building sharp lineups in intimate rooms.',
    bio: 'Laugh Track Collective produces independent comedy nights across Denver, pairing touring comics with rising local voices in intimate rooms built for fast, memorable sets.',
    followerCount: 12640,
  },
  {
    name: 'Redline Presents',
    slug: 'redline-presents',
    category: 'Live Music Promoter',
    location: 'Seattle, WA',
    initials: 'RP',
    shortBio:
      'A live music promoter curating indie, punk, and alternative bills.',
    bio: 'Redline Presents is a Seattle live music promoter known for thoughtful indie, punk, and alternative bills that connect emerging artists with rooms ready to move.',
    followerCount: 23190,
  },
  {
    name: 'Open Air Assembly',
    slug: 'open-air-assembly',
    category: 'Festival Organizer',
    location: 'New Orleans, LA',
    initials: 'OA',
    shortBio:
      'Outdoor festival organizers blending music, food, art, and neighborhood energy.',
    bio: 'Open Air Assembly organizes outdoor festivals in New Orleans that blend live music, food vendors, visual artists, and neighborhood energy into full-day community gatherings.',
    followerCount: 34750,
  },
  {
    name: 'Marquee Room Events',
    slug: 'marquee-room-events',
    category: 'Venue-Based Event Company',
    location: 'Atlanta, GA',
    initials: 'MR',
    shortBio:
      'A venue-based event team programming recurring showcases and special nights.',
    bio: 'Marquee Room Events is an Atlanta venue-based event company programming recurring showcases, themed nights, and special productions that give local audiences a reason to come back.',
    followerCount: 19880,
  },
]

export function findProducerBySlug(slug?: string) {
  return producers.find((producer) => producer.slug === slug)
}

export function formatFollowerCount(count: number) {
  return new Intl.NumberFormat('en-US').format(count)
}
