import { Children, useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../account/auth-context'
import {
  cancelAdminEvent,
  checkCurrentUserIsAdmin,
  clearRememberedAdminExit,
  deleteAdminEvent,
  fetchAdminPanelData,
  rememberAdminExit,
  removeAdminUserAppProfile,
  runAdminCleanSlateReset,
  type AdminCheckIn,
  type AdminEvent,
  type AdminPanelData,
  type AdminReservation,
  type AdminUser,
} from './admin'

type AdminStatus = 'checking' | 'authorized' | 'denied' | 'error'
type AdminSectionId =
  | 'overview'
  | 'users'
  | 'events'
  | 'tickets'
  | 'check-ins'
  | 'analytics'
  | 'danger'
type ActionMessage = {
  type: 'success' | 'error'
  text: string
}

const resetConfirmationPhrase = 'RESET PRIVATE TESTING DATA'

const adminSections = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'events', label: 'Events' },
  { id: 'tickets', label: 'Tickets' },
  { id: 'check-ins', label: 'Check-ins' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'danger', label: 'Danger Zone' },
] satisfies { id: AdminSectionId; label: string }[]

function AdminPage() {
  const { isLoading, session } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState<AdminStatus>('checking')
  const [panelData, setPanelData] = useState<AdminPanelData | null>(null)
  const [message, setMessage] = useState('')
  const [actionMessage, setActionMessage] = useState<ActionMessage | null>(null)
  const [activeSection, setActiveSection] =
    useState<AdminSectionId>('overview')
  const [isActionRunning, setIsActionRunning] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [resetConfirmation, setResetConfirmation] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadAdminAccess() {
      if (isLoading) {
        return
      }

      if (!session) {
        setStatus('denied')
        setPanelData(null)
        setMessage('')
        return
      }

      setStatus('checking')
      setMessage('')

      try {
        const isAdmin = await checkCurrentUserIsAdmin()

        if (!isMounted) {
          return
        }

        if (!isAdmin) {
          setStatus('denied')
          setPanelData(null)
          return
        }

        let nextPanelData = createEmptyAdminPanelData()

        try {
          nextPanelData = await fetchAdminPanelData()
        } catch (error) {
          console.error('[admin] panel data load failed', error)

          if (isMounted) {
            setActionMessage({
              type: 'error',
              text:
                error instanceof Error
                  ? error.message
                  : 'Admin access is active, but panel data could not load. Run supabase db push and refresh.',
            })
          }
        }

        if (isMounted) {
          clearRememberedAdminExit()
          setPanelData(nextPanelData)
          setStatus('authorized')
        }
      } catch (error) {
        if (isMounted) {
          setStatus('error')
          setMessage(
            error instanceof Error
              ? error.message
              : 'Admin access could not be checked.',
          )
        }
      }
    }

    void loadAdminAccess()

    return () => {
      isMounted = false
    }
  }, [isLoading, session])

  async function refreshPanelData() {
    const nextPanelData = await fetchAdminPanelData()
    setPanelData(nextPanelData)
  }

  async function runAdminAction(
    action: () => Promise<unknown>,
    successText: string,
  ) {
    setIsActionRunning(true)
    setActionMessage(null)

    try {
      await action()
      await refreshPanelData()
      setActionMessage({
        type: 'success',
        text: successText,
      })
    } catch (error) {
      setActionMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'The admin action could not be completed.',
      })
    } finally {
      setIsActionRunning(false)
    }
  }

  function handleCancelEvent(event: AdminEvent) {
    if (!event.id) {
      return
    }

    if (!window.confirm(`Cancel "${event.title ?? 'this event'}"?`)) {
      return
    }

    void runAdminAction(
      () => cancelAdminEvent(event.id),
      `Cancelled ${event.title ?? 'event'}.`,
    )
  }

  function handleDeleteEvent(event: AdminEvent) {
    if (!event.id) {
      return
    }

    const confirmation = window.prompt(
      `Type DELETE EVENT to permanently delete "${event.title ?? 'this event'}".`,
    )

    if (confirmation === null) {
      return
    }

    void runAdminAction(
      () => deleteAdminEvent(event.id, confirmation),
      `Deleted ${event.title ?? 'event'}.`,
    )
  }

  function handleRemoveUser(user: AdminUser) {
    if (user.isAdmin) {
      setActionMessage({
        type: 'error',
        text: 'Admin users are protected and cannot be removed here.',
      })
      return
    }

    const confirmation = window.prompt(
      `Type REMOVE TEST USER to remove app profile data for ${user.email ?? 'this user'}. Auth user login is preserved.`,
    )

    if (confirmation === null) {
      return
    }

    void runAdminAction(
      () => removeAdminUserAppProfile(user.id, confirmation),
      `Removed app profile data for ${user.email ?? 'test user'}.`,
    )
  }

  function handleCleanSlateReset() {
    if (resetConfirmation !== resetConfirmationPhrase) {
      setActionMessage({
        type: 'error',
        text: 'Type the exact confirmation phrase before running reset.',
      })
      return
    }

    if (
      !window.confirm(
        'Run the private testing clean slate reset now? Admin users and auth users will be preserved.',
      )
    ) {
      return
    }

    void runAdminAction(
      () => runAdminCleanSlateReset(resetConfirmation),
      'Private testing clean slate reset completed.',
    )
  }

  function handleExitAdmin() {
    if (session?.user.id) {
      rememberAdminExit(session.user.id)
    }

    navigate('/app', { replace: true })
  }

  async function handleSignOut() {
    setIsSigningOut(true)
    setActionMessage(null)

    try {
      clearRememberedAdminExit()
      const { error } = await supabase.auth.signOut()

      if (error) {
        throw error
      }

      navigate('/app', { replace: true })
    } catch (error) {
      setActionMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Sign out could not be completed.',
      })
    } finally {
      setIsSigningOut(false)
    }
  }

  if (isLoading || status === 'checking') {
    return (
      <section className="content-card empty-state">
        <h2>Checking admin access...</h2>
        <p>Verifying your signed-in account.</p>
      </section>
    )
  }

  if (status === 'denied') {
    return (
      <section className="content-card empty-state">
        <h2>Access denied</h2>
        <p>This hidden admin route is restricted to approved admin users.</p>
        <Link to={session ? '/app' : '/app/account'} className="back-link">
          {session ? 'Return to Discover' : 'Log in'}
        </Link>
      </section>
    )
  }

  if (status === 'error') {
    return (
      <section className="content-card empty-state">
        <h2>Admin access could not load</h2>
        <p>{message || 'Please try again in a moment.'}</p>
        <Link to="/app" className="back-link">
          Return to Discover
        </Link>
      </section>
    )
  }

  if (!panelData) {
    return (
      <section className="content-card empty-state">
        <h2>Admin Panel</h2>
        <p>Admin data is not available yet.</p>
      </section>
    )
  }

  return (
    <section className="admin-page">
      <div className="admin-panel-header">
        <header>
          <span>Street Team Control</span>
          <h2>Admin Panel</h2>
          <p>{session?.user.email ?? 'Signed-in admin'}</p>
        </header>

        <div className="admin-panel-header-actions">
          <button
            type="button"
            className="admin-exit-button"
            onClick={handleExitAdmin}
          >
            Back to App
          </button>
          <button
            type="button"
            className="admin-sign-out-button"
            disabled={isSigningOut}
            onClick={handleSignOut}
          >
            {isSigningOut ? 'Signing out...' : 'Sign Out'}
          </button>
        </div>
      </div>

      <nav className="admin-section-nav" aria-label="Admin sections">
        {adminSections.map((section) => (
          <button
            key={section.id}
            type="button"
            className={activeSection === section.id ? 'is-active' : ''}
            onClick={() => setActiveSection(section.id)}
          >
            {section.label}
          </button>
        ))}
      </nav>

      {actionMessage ? (
        <p className={`admin-action-message ${actionMessage.type}`}>
          {actionMessage.text}
        </p>
      ) : null}

      {activeSection === 'overview' ? (
        <OverviewSection panelData={panelData} />
      ) : null}

      {activeSection === 'users' ? (
        <UsersSection
          isActionRunning={isActionRunning}
          users={panelData.users}
          onRemoveUser={handleRemoveUser}
        />
      ) : null}

      {activeSection === 'events' ? (
        <EventsSection
          events={panelData.events}
          isActionRunning={isActionRunning}
          onCancelEvent={handleCancelEvent}
          onDeleteEvent={handleDeleteEvent}
        />
      ) : null}

      {activeSection === 'tickets' ? (
        <TicketsSection reservations={panelData.reservations} />
      ) : null}

      {activeSection === 'check-ins' ? (
        <CheckInsSection checkIns={panelData.checkIns} />
      ) : null}

      {activeSection === 'analytics' ? (
        <AnalyticsSection panelData={panelData} />
      ) : null}

      {activeSection === 'danger' ? (
        <DangerZoneSection
          isActionRunning={isActionRunning}
          resetConfirmation={resetConfirmation}
          onResetConfirmationChange={setResetConfirmation}
          onRunReset={handleCleanSlateReset}
        />
      ) : null}
    </section>
  )
}

function OverviewSection({ panelData }: { panelData: AdminPanelData }) {
  return (
    <section className="account-card">
      <header className="section-heading">
        <h2>Overview</h2>
        <p>Private testing readiness at a glance.</p>
      </header>

      <MetricGrid
        metrics={[
          ['Total users', panelData.overview.totalUsers],
          ['Fans', panelData.overview.fans],
          ['Performers', panelData.overview.performers],
          ['Producers', panelData.overview.producers],
          ['Venues', panelData.overview.venues],
          ['Events', panelData.overview.events],
          ['Paid events', panelData.overview.paidEvents],
          ['Free events', panelData.overview.freeEvents],
          ['Reservations', panelData.overview.ticketReservations],
          ['Checked-in tickets', panelData.overview.checkedInTickets],
        ]}
      />
    </section>
  )
}

function UsersSection({
  isActionRunning,
  users,
  onRemoveUser,
}: {
  isActionRunning: boolean
  users: AdminUser[]
  onRemoveUser: (user: AdminUser) => void
}) {
  return (
    <section className="account-card">
      <header className="section-heading">
        <h2>Users</h2>
        <p>App profile cleanup preserves auth users and protects admins.</p>
      </header>

      <AdminTable
        emptyText="No users found."
        headers={['User', 'Account type', 'Roles', 'Admin', 'Created', 'Actions']}
      >
        {users.map((user) => (
          <tr key={user.id}>
            <td>
              <strong>{user.email ?? 'No email'}</strong>
              <span>{user.displayName ?? 'No display name'}</span>
            </td>
            <td>{user.accountType ?? 'No profile'}</td>
            <td>{user.roles || 'User'}</td>
            <td>{user.isAdmin ? 'Yes' : 'No'}</td>
            <td>{formatDateTime(user.createdAt)}</td>
            <td>
              <button
                type="button"
                className="admin-inline-action"
                disabled={isActionRunning || user.isAdmin}
                onClick={() => onRemoveUser(user)}
              >
                {user.isAdmin ? 'Protected' : 'Remove app profile'}
              </button>
            </td>
          </tr>
        ))}
      </AdminTable>
    </section>
  )
}

function EventsSection({
  events,
  isActionRunning,
  onCancelEvent,
  onDeleteEvent,
}: {
  events: AdminEvent[]
  isActionRunning: boolean
  onCancelEvent: (event: AdminEvent) => void
  onDeleteEvent: (event: AdminEvent) => void
}) {
  return (
    <section className="account-card">
      <header className="section-heading">
        <h2>Events</h2>
        <p>Review, preview, cancel, or delete private testing events.</p>
      </header>

      <AdminTable
        emptyText="No events found."
        headers={[
          'Event',
          'Owner',
          'Status',
          'Tickets',
          'Date',
          'Sold',
          'Preview',
          'Actions',
        ]}
      >
        {events.map((event) => (
          <tr key={event.id}>
            <td>
              <strong>{event.title ?? 'Untitled event'}</strong>
              <span>
                {event.venueName ?? 'Venue missing'}
                {event.city || event.state
                  ? ` - ${[event.city, event.state].filter(Boolean).join(', ')}`
                  : ''}
              </span>
            </td>
            <td>{event.ownerName || event.ownerEmail || 'Unknown owner'}</td>
            <td>{event.status ?? 'Unknown'}</td>
            <td>{event.ticketMode}</td>
            <td>
              {formatEventDateTime(event.eventDate, event.startTime)}
            </td>
            <td>
              {event.ticketsSold.toLocaleString()} /{' '}
              {event.ticketCapacity.toLocaleString()}
            </td>
            <td>
              {event.publicPath ? (
                <Link to={toAppPath(event.publicPath)}>View</Link>
              ) : (
                'Unavailable'
              )}
            </td>
            <td>
              <div className="admin-inline-actions">
                <button
                  type="button"
                  className="admin-inline-action"
                  disabled={isActionRunning || event.status === 'cancelled'}
                  onClick={() => onCancelEvent(event)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="admin-inline-action danger"
                  disabled={isActionRunning}
                  onClick={() => onDeleteEvent(event)}
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
        ))}
      </AdminTable>
    </section>
  )
}

function TicketsSection({
  reservations,
}: {
  reservations: AdminReservation[]
}) {
  return (
    <section className="account-card">
      <header className="section-heading">
        <h2>Tickets / Reservations</h2>
        <p>Recent reservation records, guest status, email status, and QR check-ins.</p>
      </header>

      <AdminTable
        emptyText="No reservations found."
        headers={[
          'Event',
          'Buyer',
          'Type',
          'Status',
          'QR',
          'Channel',
          'Total',
          'Email',
          'Actions',
        ]}
      >
        {reservations.map((reservation) => (
          <tr key={reservation.id}>
            <td>
              <strong>{reservation.eventTitle ?? 'Event unavailable'}</strong>
              <span>{reservation.ticketTypeName ?? 'Ticket type unavailable'}</span>
            </td>
            <td>
              <strong>{reservation.buyerEmail ?? 'No email'}</strong>
              <span>{reservation.buyerName ?? 'No buyer name'}</span>
            </td>
            <td>{reservation.buyerType}</td>
            <td>{reservation.reservationStatus}</td>
            <td>
              {reservation.checkedInCount.toLocaleString()} /{' '}
              {reservation.ticketCount.toLocaleString()}
            </td>
            <td>{reservation.salesChannel}</td>
            <td>{formatCurrency(reservation.totalPriceCents)}</td>
            <td>
              {reservation.ticketEmailError
                ? 'Email failed'
                : reservation.ticketEmailSentAt
                  ? 'Email sent'
                  : 'No email sent'}
            </td>
            <td>
              <button type="button" className="admin-inline-action" disabled>
                Resend not implemented
              </button>
            </td>
          </tr>
        ))}
      </AdminTable>
    </section>
  )
}

function CheckInsSection({ checkIns }: { checkIns: AdminCheckIn[] }) {
  return (
    <section className="account-card">
      <header className="section-heading">
        <h2>Check-ins / Box Office</h2>
        <p>Issued tickets, QR status, and door sale indicators.</p>
      </header>

      <AdminTable
        emptyText="No issued tickets found."
        headers={[
          'Event',
          'Ticket',
          'Status',
          'Checked in',
          'Buyer',
          'Channel',
          'Created',
        ]}
      >
        {checkIns.map((checkIn) => (
          <tr key={checkIn.ticketId}>
            <td>
              <strong>{checkIn.eventTitle ?? 'Event unavailable'}</strong>
              <span>{checkIn.ticketTypeName ?? 'Ticket type unavailable'}</span>
            </td>
            <td>#{checkIn.ticketNumber}</td>
            <td>{checkIn.ticketStatus}</td>
            <td>{checkIn.checkedInAt ? formatDateTime(checkIn.checkedInAt) : 'No'}</td>
            <td>
              <strong>{checkIn.buyerEmail ?? 'No email'}</strong>
              <span>{checkIn.buyerName ?? 'No buyer name'}</span>
            </td>
            <td>{checkIn.isDoorSale ? 'Door sale' : checkIn.salesChannel}</td>
            <td>{formatDateTime(checkIn.createdAt)}</td>
          </tr>
        ))}
      </AdminTable>
    </section>
  )
}

function AnalyticsSection({ panelData }: { panelData: AdminPanelData }) {
  return (
    <section className="account-card">
      <header className="section-heading">
        <h2>Platform Analytics</h2>
        <p>Basic totals from reservations and issued tickets.</p>
      </header>

      <MetricGrid
        metrics={[
          ['Tickets sold', panelData.platformAnalytics.totalTicketsSold],
          [
            'Gross revenue',
            formatCurrency(panelData.platformAnalytics.grossTicketRevenueCents),
          ],
          [
            'Street Team fees',
            formatCurrency(
              panelData.platformAnalytics.estimatedStreetTeamFeesCents,
            ),
          ],
          ['Guest purchases', panelData.platformAnalytics.guestPurchases],
          [
            'Signed-in purchases',
            panelData.platformAnalytics.signedInFanPurchases,
          ],
          [
            'Door sales',
            panelData.platformAnalytics.doorBoxOfficeSales,
          ],
          ['Check-ins', panelData.platformAnalytics.totalCheckIns],
        ]}
      />
    </section>
  )
}

function DangerZoneSection({
  isActionRunning,
  resetConfirmation,
  onResetConfirmationChange,
  onRunReset,
}: {
  isActionRunning: boolean
  resetConfirmation: string
  onResetConfirmationChange: (value: string) => void
  onRunReset: () => void
}) {
  return (
    <section className="account-card danger-zone-card">
      <header className="section-heading">
        <h2>Danger Zone</h2>
        <p>
          Clean slate reset clears private testing data while preserving admin
          users, admin roles, auth users, schema, buckets, and integrations.
        </p>
      </header>

      <div className="admin-danger-panel">
        <p>
          Type <strong>{resetConfirmationPhrase}</strong> to enable the reset.
        </p>
        <input
          type="text"
          value={resetConfirmation}
          onChange={(event) => onResetConfirmationChange(event.target.value)}
        />
        <button
          type="button"
          className="admin-danger-button"
          disabled={
            isActionRunning || resetConfirmation !== resetConfirmationPhrase
          }
          onClick={onRunReset}
        >
          {isActionRunning ? 'Running reset...' : 'Run Clean Slate Reset'}
        </button>
      </div>
    </section>
  )
}

function MetricGrid({
  metrics,
}: {
  metrics: [string, number | string][]
}) {
  return (
    <div className="admin-metrics-grid">
      {metrics.map(([label, value]) => (
        <div className="admin-metric-card" key={label}>
          <span>{label}</span>
          <strong>{typeof value === 'number' ? value.toLocaleString() : value}</strong>
        </div>
      ))}
    </div>
  )
}

function AdminTable({
  children,
  emptyText,
  headers,
}: {
  children: ReactNode
  emptyText: string
  headers: string[]
}) {
  if (Children.count(children) === 0) {
    return <p>{emptyText}</p>
  }

  return (
    <div className="admin-table-wrapper">
      <table className="admin-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat(undefined, {
    currency: 'USD',
    style: 'currency',
  }).format(cents / 100)
}

function formatEventDateTime(date: string | null, time: string | null) {
  return [date ? formatShortDate(date) : '', time ? formatTime(time) : '']
    .filter(Boolean)
    .join(' at ')
}

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Unknown'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatShortDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)

  if (!year || !month || !day) {
    return value
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
  }).format(new Date(year, month - 1, day))
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number)

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return value
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2000, 0, 1, hours, minutes))
}

function createEmptyAdminPanelData(): AdminPanelData {
  return {
    checkIns: [],
    events: [],
    overview: {
      checkedInTickets: 0,
      events: 0,
      fans: 0,
      freeEvents: 0,
      paidEvents: 0,
      performers: 0,
      producers: 0,
      ticketReservations: 0,
      totalUsers: 0,
      venues: 0,
    },
    platformAnalytics: {
      doorBoxOfficeSales: 0,
      estimatedStreetTeamFeesCents: 0,
      grossTicketRevenueCents: 0,
      guestPurchases: 0,
      signedInFanPurchases: 0,
      totalCheckIns: 0,
      totalTicketsSold: 0,
    },
    reservations: [],
    users: [],
  }
}

function toAppPath(path: string | null) {
  if (!path) {
    return '/app'
  }

  return path.startsWith('/app') ? path : `/app${path}`
}

export default AdminPage
