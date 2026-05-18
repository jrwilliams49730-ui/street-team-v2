import { Navigate, NavLink, Route, Routes } from 'react-router-dom'
import AccountPage from './features/account/AccountPage'
import { useAuth } from './features/account/auth-context'
import DiscoverPage from './features/discover/DiscoverPage'
import PerformerDirectory from './features/performers/PerformerDirectory'
import PerformerProfile from './features/performers/PerformerProfile'
import ProducerDirectory from './features/producers/ProducerDirectory'
import ProducerProfile from './features/producers/ProducerProfile'
import VenueDirectory from './features/venues/VenueDirectory'
import VenueProfile from './features/venues/VenueProfile'
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
  {
    path: '/account',
    label: 'Account',
  },
] as const

function AccountStatusBadge() {
  const { session } = useAuth()
  const statusText = session
    ? session.user.email ?? 'Signed in'
    : 'Not signed in'

  return <span className="account-status-badge">{statusText}</span>
}

function App() {
  return (
    <main className="app-shell">
      <div className="app-frame">
        <header className="app-header">
          <h1>Street Team</h1>
          <p>Live entertainment, powered by the crowd.</p>
          <AccountStatusBadge />
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
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/performers" element={<PerformerDirectory />} />
          <Route path="/performers/:slug" element={<PerformerProfile />} />
          <Route path="/producers" element={<ProducerDirectory />} />
          <Route path="/producers/:slug" element={<ProducerProfile />} />
          <Route path="/venues" element={<VenueDirectory />} />
          <Route path="/venues/:slug" element={<VenueProfile />} />
          <Route path="/account" element={<AccountPage />} />
        </Routes>
      </div>
    </main>
  )
}

export default App
