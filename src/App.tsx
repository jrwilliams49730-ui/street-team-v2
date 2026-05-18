import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import './App.css'

const sections = [
  {
    path: '/discover',
    label: 'Discover',
    heading: 'Discover the live scene',
    text: 'Find performers, producers, and venues worth following.',
  },
  {
    path: '/performers',
    label: 'Performers',
    heading: 'Performers',
    text: 'Comedians, bands, DJs, and entertainers will live here.',
  },
  {
    path: '/producers',
    label: 'Producers',
    heading: 'Producers',
    text: 'Follow the people and teams creating the shows.',
  },
  {
    path: '/venues',
    label: 'Venues',
    heading: 'Venues',
    text: 'Keep up with the places hosting live events near you.',
  },
] as const

type Section = (typeof sections)[number]

function SectionCard({ heading, text }: Pick<Section, 'heading' | 'text'>) {
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
          {sections.map((section) => (
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
          {sections.map((section) => (
            <Route
              key={section.path}
              path={section.path}
              element={
                <SectionCard heading={section.heading} text={section.text} />
              }
            />
          ))}
        </Routes>
      </div>
    </main>
  )
}

export default App
