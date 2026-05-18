import { Link } from 'react-router-dom'
import { performers } from '../performers/performers'
import { producers } from '../producers/producers'
import { venues } from '../venues/venues'

type FeaturedItem = {
  name: string
  slug: string
  category: string
  location: string
  initials: string
  followerCount: number
}

type FeaturedSection = {
  title: string
  viewAllLabel: string
  viewAllPath: string
  profileBasePath: string
  accentClass: string
  items: FeaturedItem[]
}

const featuredSections: FeaturedSection[] = [
  {
    title: 'Featured performers',
    viewAllLabel: 'View all performers',
    viewAllPath: '/performers',
    profileBasePath: '/performers',
    accentClass: 'is-performer',
    items: performers.slice(0, 3),
  },
  {
    title: 'Featured producers',
    viewAllLabel: 'View all producers',
    viewAllPath: '/producers',
    profileBasePath: '/producers',
    accentClass: 'is-producer',
    items: producers.slice(0, 3),
  },
  {
    title: 'Featured venues',
    viewAllLabel: 'View all venues',
    viewAllPath: '/venues',
    profileBasePath: '/venues',
    accentClass: 'is-venue',
    items: venues.slice(0, 3),
  },
]

function formatFollowerCount(count: number) {
  return new Intl.NumberFormat('en-US').format(count)
}

function DiscoverPage() {
  return (
    <section className="discover-page">
      <header className="discover-hero">
        <p className="eyebrow">Street Team Network</p>
        <h2>Discover the live scene</h2>
        <p>
          Find performers, producers, and venues worth following so the next
          great show is already on your radar.
        </p>
      </header>

      {featuredSections.map((section) => (
        <section key={section.title} className="featured-section">
          <div className="featured-section-header">
            <h3>{section.title}</h3>
          </div>

          <div className="featured-grid">
            {section.items.map((item) => (
              <Link
                key={item.slug}
                to={`${section.profileBasePath}/${item.slug}`}
                className="featured-card"
              >
                <div
                  className={`featured-avatar ${section.accentClass}`}
                  aria-hidden="true"
                >
                  {item.initials}
                </div>

                <div className="featured-card-copy">
                  <h4>{item.name}</h4>
                  <p>
                    {item.category} | {item.location}
                  </p>
                  <span>
                    {formatFollowerCount(item.followerCount)} followers
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <Link to={section.viewAllPath} className="view-all-link">
            {section.viewAllLabel}
          </Link>
        </section>
      ))}
    </section>
  )
}

export default DiscoverPage
