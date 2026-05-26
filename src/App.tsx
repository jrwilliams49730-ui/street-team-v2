import { useEffect, useState } from 'react'
import {
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import AccountPage from './features/account/AccountPage'
import { useAuth } from './features/account/auth-context'
import type { AccountType } from './features/account/accountTypes'
import { fetchUserProfile } from './features/account/userProfile'
import AdminPage from './features/admin/AdminPage'
import {
  CheckoutCancelledPage,
  CheckoutSuccessPage,
} from './features/checkout/CheckoutReturnPages'
import DiscoverPage from './features/discover/DiscoverPage'
import EventDirectory from './features/events/EventDirectory'
import EventProfile from './features/events/EventProfile'
import LandingPage from './features/landing/LandingPage'
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
    path: '/app',
    label: 'Discover',
  },
  {
    key: 'events',
    path: '/app/events',
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
  return (
    <Routes>
      <Route index element={<LandingPage />} />

      <Route path="app" element={<AppShell />}>
        <Route index element={<DiscoverPage />} />
        <Route path="discover" element={<DiscoverPage />} />
        <Route path="performers" element={<PerformerDirectory />} />
        <Route path="performers/:slug" element={<PerformerProfile />} />
        <Route path="producers" element={<ProducerDirectory />} />
        <Route path="producers/:slug" element={<ProducerProfile />} />
        <Route path="venues" element={<VenueDirectory />} />
        <Route path="venues/:slug" element={<VenueProfile />} />
        <Route path="events" element={<EventDirectory />} />
        <Route path="events/:slug" element={<EventProfile />} />
        <Route path="tickets/:qrToken" element={<GuestTicketPage />} />
        <Route
          path="my-tickets"
          element={<Navigate to="/app/account?tab=my-tickets" replace />}
        />
        <Route path="checkout/success" element={<CheckoutSuccessPage />} />
        <Route
          path="checkout/cancelled"
          element={<CheckoutCancelledPage />}
        />
        <Route path="account" element={<AccountPage />} />
        <Route path="admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Route>

      <Route path="discover" element={<RedirectToAppPath />} />
      <Route path="performers" element={<RedirectToAppPath />} />
      <Route path="performers/:slug" element={<RedirectToAppPath />} />
      <Route path="producers" element={<RedirectToAppPath />} />
      <Route path="producers/:slug" element={<RedirectToAppPath />} />
      <Route path="venues" element={<RedirectToAppPath />} />
      <Route path="venues/:slug" element={<RedirectToAppPath />} />
      <Route path="events" element={<RedirectToAppPath />} />
      <Route path="events/:slug" element={<RedirectToAppPath />} />
      <Route path="tickets/:qrToken" element={<RedirectToAppPath />} />
      <Route
        path="my-tickets"
        element={<Navigate to="/app/account?tab=my-tickets" replace />}
      />
      <Route path="checkout/success" element={<RedirectToAppPath />} />
      <Route path="checkout/cancelled" element={<RedirectToAppPath />} />
      <Route path="account" element={<RedirectToAppPath />} />
      <Route path="admin" element={<RedirectToAppPath />} />
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}

function AppShell() {
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

        <Outlet />
      </div>
    </main>
  )
}

function RedirectToAppPath() {
  const location = useLocation()

  return (
    <Navigate
      to={`/app${location.pathname}${location.search}${location.hash}`}
      replace
    />
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
      path: '/app/account',
    }
  }

  if (accountType === 'performer') {
    return {
      key: 'account',
      label: 'My Profile',
      path: '/app/account?tab=my-profile',
    }
  }

  if (accountType === 'producer') {
    return {
      key: 'account',
      label: 'Dashboard',
      path: '/app/account?tab=my-profile',
    }
  }

  if (accountType === 'venue') {
    return {
      key: 'account',
      label: 'Dashboard',
      path: '/app/account?tab=my-profile',
    }
  }

  return {
    key: 'account',
    label: 'My Stuff',
    path: '/app/account?tab=my-tickets',
  }
}

function isNavigationSectionActive(
  section: NavigationSection,
  pathname: string,
) {
  if (section.key === 'discover') {
    return (
      pathname === '/app' ||
      pathname === '/app/discover' ||
      pathname.startsWith('/app/performers') ||
      pathname.startsWith('/app/producers') ||
      pathname.startsWith('/app/venues')
    )
  }

  if (section.key === 'account') {
    return pathname === '/app/account' || pathname === '/app/my-tickets'
  }

  return pathname.startsWith(section.path)
}

export default App
