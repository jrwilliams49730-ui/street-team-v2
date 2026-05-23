import { useEffect, useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import AccountPage from './features/account/AccountPage'
import { useAuth } from './features/account/auth-context'
import type { AccountType } from './features/account/accountTypes'
import { fetchUserProfile } from './features/account/userProfile'
import {
  CheckoutCancelledPage,
  CheckoutSuccessPage,
} from './features/checkout/CheckoutReturnPages'
import DiscoverPage from './features/discover/DiscoverPage'
import EventDirectory from './features/events/EventDirectory'
import EventProfile from './features/events/EventProfile'
import PerformerDirectory from './features/performers/PerformerDirectory'
import PerformerProfile from './features/performers/PerformerProfile'
import ProducerDirectory from './features/producers/ProducerDirectory'
import ProducerProfile from './features/producers/ProducerProfile'
import GuestTicketPage from './features/tickets/GuestTicketPage'
import VenueDirectory from './features/venues/VenueDirectory'
import VenueProfile from './features/venues/VenueProfile'
import './App.css'

type NavigationSection = {
  key: 'discover' | 'events' | 'account'
  label: string
  path: string
}

const publicNavigationSections = [
  {
    key: 'discover',
    path: '/discover',
    label: 'Discover',
  },
  {
    key: 'events',
    path: '/events',
    label: 'Events',
  },
] satisfies NavigationSection[]

function AccountStatusBadge() {
  const { session } = useAuth()
  const statusText = session
    ? session.user.email ?? 'Signed in'
    : 'Not signed in'

  return <span className="account-status-badge">{statusText}</span>
}

function App() {
  const { session } = useAuth()
  const location = useLocation()
  const [accountType, setAccountType] = useState<AccountType>('fan')

  useEffect(() => {
    let isMounted = true

    async function loadAccountType() {
      if (!session) {
        setAccountType('fan')
        return
      }

      try {
        const profile = await fetchUserProfile(session.user.id)

        if (isMounted) {
          setAccountType(profile.accountType)
        }
      } catch {
        if (isMounted) {
          setAccountType('fan')
        }
      }
    }

    void loadAccountType()

    return () => {
      isMounted = false
    }
  }, [session])

  const navigationSections = [
    ...publicNavigationSections,
    getAccountNavigationSection(Boolean(session), accountType),
  ]

  return (
    <main className="app-shell">
      <div className="app-frame">
        <header className="app-header">
          <div className="brand-lockup">
            <h1 className="brand-title">
              <img
                src="/assets/header-logo.png"
                alt="Street Team"
                className="brand-logo"
              />
            </h1>

            <div className="brand-meta">
              <p>Turn your fans into promoters.</p>
              <AccountStatusBadge />
            </div>
          </div>
        </header>

        <nav className="tab-nav" aria-label="Creator and fan network">
          {navigationSections.map((section) => (
            <NavLink
              key={section.key}
              to={section.path}
              className={({ isActive }) =>
                `tab-button ${
                  isActive || isNavigationSectionActive(section, location.pathname)
                    ? 'is-active'
                    : ''
                }`
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
          <Route path="/events" element={<EventDirectory />} />
          <Route path="/events/:slug" element={<EventProfile />} />
          <Route path="/tickets/:qrToken" element={<GuestTicketPage />} />
          <Route
            path="/my-tickets"
            element={<Navigate to="/account?tab=my-tickets" replace />}
          />
          <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
          <Route
            path="/checkout/cancelled"
            element={<CheckoutCancelledPage />}
          />
          <Route path="/account" element={<AccountPage />} />
        </Routes>
      </div>
    </main>
  )
}

function getAccountNavigationSection(
  isSignedIn: boolean,
  accountType: AccountType,
): NavigationSection {
  if (!isSignedIn) {
    return {
      key: 'account',
      label: 'Login',
      path: '/account',
    }
  }

  if (accountType === 'performer') {
    return {
      key: 'account',
      label: 'My Profile',
      path: '/account?tab=my-profile',
    }
  }

  if (accountType === 'producer' || accountType === 'venue') {
    return {
      key: 'account',
      label: 'Dashboard',
      path: '/account?tab=my-events',
    }
  }

  return {
    key: 'account',
    label: 'My Stuff',
    path: '/account?tab=my-tickets',
  }
}

function isNavigationSectionActive(
  section: NavigationSection,
  pathname: string,
) {
  if (section.key === 'discover') {
    return (
      pathname === '/discover' ||
      pathname.startsWith('/performers') ||
      pathname.startsWith('/producers') ||
      pathname.startsWith('/venues')
    )
  }

  if (section.key === 'account') {
    return pathname === '/account' || pathname === '/my-tickets'
  }

  return pathname.startsWith(section.path)
}

export default App
