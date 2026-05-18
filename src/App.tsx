import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import PerformerDirectory from './features/performers/PerformerDirectory'
import PerformerProfile from './features/performers/PerformerProfile'
import './App.css'

const navigationSections = [
  {
    path: '/discover',
    label: 'Discover',
  },
  {
    path: '/performers',
    label: 'Performers',
  },
  {
    path: '/producers',
    label: 'Producers',
  },
  {
    path: '/venues',
    label: 'Venues',
  },
] as const

const placeholderSections = [
  {
    path: '/discover',
    heading: 'Discover the live scene',
    text: 'Find performers, producers, and venues worth following.',
  },
  {
    path: '/producers',
    heading: 'Producers',
    text: 'Follow the people and teams creating the shows.',
  },
  {
    path: '/venues',
    heading: 'Venues',
    text: 'Keep up with the places hosting live events near you.',
  },
] as const

type PlaceholderSection = (typeof placeholderSections)[number]

function SectionCard({
  heading,
  text,
}: Pick<PlaceholderSection, 'heading' | 'text'>) {
  return (
    <section className="content-card">
      <h2>{heading}</h2>
      <p>{text}</p>
    </section>
  )
}

function App() {
  return (
    <main className="app-shell">
      <div className="app-frame">
        <header className="app-header">
          <h1>Street Team</h1>
          <p>Live entertainment, powered by the crowd.</p>
        </header>

        <nav className="tab-nav" aria-label="Creator and fan network">
          {navigationSections.map((section) => (
            <NavLink
              key={section.path}
              to={section.path}
              className={({ isActive }) =>
                `tab-button ${isActive ? 'is-active' : ''}`
              }
            >
              {section.label}
            </NavLink>
          ))}
        </nav>

        <Routes>
          <Route path="/" element={<Navigate to="/discover" replace />} />
          {placeholderSections.map((section) => (
            <Route
              key={section.path}
              path={section.path}
              element={
                <SectionCard heading={section.heading} text={section.text} />
              }
            />
          ))}
          <Route path="/performers" element={<PerformerDirectory />} />
          <Route path="/performers/:slug" element={<PerformerProfile />} />
        </Routes>
      </div>
    </main>
  )
}

export default App
