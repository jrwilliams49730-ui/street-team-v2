export type Performer = {
  name: string
  slug: string
  category: string
  location: string
  initials: string
  shortBio: string
  bio: string
  followerCount: number
}

export const performers: Performer[] = [
  {
    name: 'Maya Rivera',
    slug: 'maya-rivera',
    category: 'Comedian',
    location: 'Chicago, IL',
    initials: 'MR',
    shortBio:
      'Sharp crowd work, late-night stories, and a fearless point of view.',
    bio: 'Maya Rivera is a Chicago comic known for sharp crowd work, late-night stories, and a fearless point of view that turns everyday chaos into fast-moving sets.',
    followerCount: 18420,
  },
  {
    name: 'Northbound Atlas',
    slug: 'northbound-atlas',
    category: 'Band',
    location: 'Nashville, TN',
    initials: 'NA',
    shortBio:
      'An indie rock four-piece built on big choruses and road-worn harmonies.',
    bio: 'Northbound Atlas is a Nashville indie rock band built on big choruses, road-worn harmonies, and live shows that move from intimate verses into full-room singalongs.',
    followerCount: 26780,
  },
  {
    name: 'DJ Solstice',
    slug: 'dj-solstice',
    category: 'DJ',
    location: 'Miami, FL',
    initials: 'DS',
    shortBio:
      'House, disco, and sunrise sets tuned for dance floors that stay late.',
    bio: 'DJ Solstice blends house, disco, and warm-weather percussion into sunrise-ready sets designed for dance floors that want momentum without losing soul.',
    followerCount: 32110,
  },
  {
    name: 'Lena Vale',
    slug: 'lena-vale',
    category: 'Singer/Songwriter',
    location: 'Austin, TX',
    initials: 'LV',
    shortBio:
      'Story-first songs with intimate vocals and folk-pop arrangements.',
    bio: 'Lena Vale is an Austin singer/songwriter whose story-first writing pairs intimate vocals with folk-pop arrangements and room-stilling live performances.',
    followerCount: 14360,
  },
]

export function findPerformerBySlug(slug?: string) {
  return performers.find((performer) => performer.slug === slug)
}

export function formatFollowerCount(count: number) {
  return new Intl.NumberFormat('en-US').format(count)
}
