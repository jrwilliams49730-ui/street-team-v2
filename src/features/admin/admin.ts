import { supabase } from '../../lib/supabase'

const adminExitStorageKey = 'street-team:admin-exit-user-id'

export type AdminDashboardMetric = {
  metric: string
  value: number
}

export type AdminOverview = {
  checkedInTickets: number
  events: number
  fans: number
  freeEvents: number
  paidEvents: number
  performers: number
  producers: number
  ticketReservations: number
  totalUsers: number
  venues: number
}

export type AdminUser = {
  accountType: string | null
  createdAt: string
  displayName: string | null
  email: string | null
  hasProfile: boolean
  id: string
  isAdmin: boolean
  roles: string
}

export type AdminEvent = {
  checkedInTickets: number
  city: string | null
  createdAt: string
  eventDate: string | null
  id: string
  organizerType: string | null
  ownerEmail: string | null
  ownerName: string | null
  publicPath: string | null
  slug: string | null
  startTime: string | null
  state: string | null
  status: string | null
  ticketCapacity: number
  ticketMode: string
  ticketsSold: number
  title: string | null
  venueName: string | null
}

export type AdminReservation = {
  buyerEmail: string | null
  buyerName: string | null
  buyerType: string
  checkedInCount: number
  createdAt: string
  eventId: string
  eventTitle: string | null
  id: string
  isDoorSale: boolean
  quantity: number
  reservationStatus: string
  salesChannel: string
  streetTeamFeeCents: number
  ticketCount: number
  ticketEmailError: string | null
  ticketEmailSentAt: string | null
  ticketKind: string
  ticketTypeName: string | null
  totalPriceCents: number
}

export type AdminCheckIn = {
  buyerEmail: string | null
  buyerName: string | null
  checkedInAt: string | null
  createdAt: string
  eventId: string
  eventTitle: string | null
  isDoorSale: boolean
  reservationId: string
  salesChannel: string
  ticketId: string
  ticketNumber: number
  ticketStatus: string
  ticketTypeName: string | null
}

export type AdminPlatformAnalytics = {
  doorBoxOfficeSales: number
  estimatedStreetTeamFeesCents: number
  grossTicketRevenueCents: number
  guestPurchases: number
  signedInFanPurchases: number
  totalCheckIns: number
  totalTicketsSold: number
}

export type AdminPanelData = {
  checkIns: AdminCheckIn[]
  events: AdminEvent[]
  overview: AdminOverview
  platformAnalytics: AdminPlatformAnalytics
  reservations: AdminReservation[]
  users: AdminUser[]
}

export type AdminActionResult = Record<string, unknown>

type AdminDashboardMetricRow = {
  metric: string
  value: number | string
}

export async function checkCurrentUserIsAdmin() {
  const { data, error } = await supabase.rpc('is_admin_user')

  if (!error) {
    return data === true
  }

  if (isMissingRpcFunctionError(error)) {
    const fallback = await supabase.rpc('current_user_has_role', {
      p_role: 'admin',
    })

    if (fallback.error) {
      throw createAdminError(
        'Admin role check failed.',
        fallback.error,
      )
    }

    return fallback.data === true
  }

  throw createAdminError('Admin role check failed.', error)
}

export function rememberAdminExit(userId: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(adminExitStorageKey, userId)
}

export function clearRememberedAdminExit() {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.removeItem(adminExitStorageKey)
}

export function shouldSkipAdminAutoRoute(userId: string) {
  if (typeof window === 'undefined') {
    return false
  }

  return window.sessionStorage.getItem(adminExitStorageKey) === userId
}

export async function fetchAdminDashboardMetrics() {
  const { data, error } = await supabase.rpc('get_admin_dashboard_counts')

  if (error) {
    throw error
  }

  return ((data ?? []) as AdminDashboardMetricRow[]).map((row) => ({
    metric: row.metric,
    value:
      typeof row.value === 'number'
        ? row.value
        : Number.parseInt(String(row.value), 10) || 0,
  }))
}

export async function fetchAdminPanelData() {
  const { data, error } = await supabase.rpc('admin_get_panel_data')

  if (error) {
    throw createAdminError('Admin panel data could not load.', error)
  }

  return normalizeAdminPanelData(data)
}

export async function cancelAdminEvent(eventId: string) {
  const { data, error } = await supabase.rpc('admin_cancel_event', {
    p_event_id: eventId,
  })

  if (error) {
    throw createAdminError('Event could not be cancelled.', error)
  }

  return (data ?? {}) as AdminActionResult
}

export async function deleteAdminEvent(
  eventId: string,
  confirmation: string,
) {
  const { data, error } = await supabase.rpc('admin_delete_event', {
    p_confirmation: confirmation,
    p_event_id: eventId,
  })

  if (error) {
    throw createAdminError('Event could not be deleted.', error)
  }

  return (data ?? {}) as AdminActionResult
}

export async function removeAdminUserAppProfile(
  userId: string,
  confirmation: string,
) {
  const { data, error } = await supabase.rpc(
    'admin_remove_user_app_profile',
    {
      p_confirmation: confirmation,
      p_user_id: userId,
    },
  )

  if (error) {
    throw createAdminError('User app profile could not be removed.', error)
  }

  return (data ?? {}) as AdminActionResult
}

export async function runAdminCleanSlateReset(confirmation: string) {
  const { data, error } = await supabase.rpc('admin_clean_slate_reset', {
    p_confirmation: confirmation,
  })

  if (error) {
    throw createAdminError('Clean slate reset could not run.', error)
  }

  return (data ?? {}) as AdminActionResult
}

function normalizeAdminPanelData(data: unknown): AdminPanelData {
  const input = isRecord(data) ? data : {}

  return {
    checkIns: Array.isArray(input.checkIns)
      ? (input.checkIns as AdminCheckIn[])
      : [],
    events: Array.isArray(input.events) ? (input.events as AdminEvent[]) : [],
    overview: normalizeOverview(input.overview),
    platformAnalytics: normalizePlatformAnalytics(input.platformAnalytics),
    reservations: Array.isArray(input.reservations)
      ? (input.reservations as AdminReservation[])
      : [],
    users: Array.isArray(input.users) ? (input.users as AdminUser[]) : [],
  }
}

function normalizeOverview(value: unknown): AdminOverview {
  const input = isRecord(value) ? value : {}

  return {
    checkedInTickets: toCount(input.checkedInTickets),
    events: toCount(input.events),
    fans: toCount(input.fans),
    freeEvents: toCount(input.freeEvents),
    paidEvents: toCount(input.paidEvents),
    performers: toCount(input.performers),
    producers: toCount(input.producers),
    ticketReservations: toCount(input.ticketReservations),
    totalUsers: toCount(input.totalUsers),
    venues: toCount(input.venues),
  }
}

function normalizePlatformAnalytics(value: unknown): AdminPlatformAnalytics {
  const input = isRecord(value) ? value : {}

  return {
    doorBoxOfficeSales: toCount(input.doorBoxOfficeSales),
    estimatedStreetTeamFeesCents: toCount(input.estimatedStreetTeamFeesCents),
    grossTicketRevenueCents: toCount(input.grossTicketRevenueCents),
    guestPurchases: toCount(input.guestPurchases),
    signedInFanPurchases: toCount(input.signedInFanPurchases),
    totalCheckIns: toCount(input.totalCheckIns),
    totalTicketsSold: toCount(input.totalTicketsSold),
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toCount(value: unknown) {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string') {
    return Number.parseInt(value, 10) || 0
  }

  return 0
}

function isMissingRpcFunctionError(error: unknown) {
  if (!isRecord(error)) {
    return false
  }

  const code = typeof error.code === 'string' ? error.code : ''
  const message = typeof error.message === 'string' ? error.message : ''

  return (
    code === 'PGRST202' ||
    message.toLowerCase().includes('could not find the function')
  )
}

function createAdminError(prefix: string, error: unknown) {
  const message = getSupabaseErrorMessage(error)
  const nextError = new Error(message ? `${prefix} ${message}` : prefix)

  console.error('[admin]', prefix, sanitizeAdminError(error))

  return nextError
}

function getSupabaseErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  if (!isRecord(error)) {
    return ''
  }

  const message = typeof error.message === 'string' ? error.message : ''
  const details = typeof error.details === 'string' ? error.details : ''
  const hint = typeof error.hint === 'string' ? error.hint : ''
  const code = typeof error.code === 'string' ? error.code : ''

  return [message, details, hint, code ? `Code: ${code}` : '']
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' ')
}

function sanitizeAdminError(error: unknown) {
  if (!isRecord(error)) {
    return {
      message: error instanceof Error ? error.message : String(error),
    }
  }

  return {
    code: typeof error.code === 'string' ? error.code : undefined,
    details: typeof error.details === 'string' ? error.details : undefined,
    hint: typeof error.hint === 'string' ? error.hint : undefined,
    message: typeof error.message === 'string' ? error.message : undefined,
  }
}
