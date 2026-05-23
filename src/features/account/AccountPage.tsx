import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  checkCurrentUserIsAdmin,
  clearRememberedAdminExit,
  shouldSkipAdminAutoRoute,
} from '../admin/admin'
import {
  accountTypeOptions,
  formatAccountType,
  type AccountType,
} from './accountTypes'
import { useAuth } from './auth-context'
import CreatorOnboardingSection from './CreatorOnboardingSection'
import FollowingSection from './FollowingSection'
import MyFanProfileSection from './MyFanProfileSection'
import MyTicketsSection from './MyTicketsSection'
import { fetchUserProfile } from './userProfile'

type AuthMode = 'create' | 'login'
type AccountTabId = 'my-profile' | 'my-tickets' | 'following' | 'appearances' | 'my-events'
type AccountTab = {
  id: AccountTabId
  label: string
}
type Message = {
  type: 'success' | 'error'
  text: string
}
type AdminRedirectStatus = 'idle' | 'checking' | 'not-admin' | 'redirecting'

const fanTabs: AccountTab[] = [
  { id: 'my-profile', label: 'My Profile' },
  { id: 'my-tickets', label: 'My Tickets' },
  { id: 'following', label: 'Following' },
]

const performerTabs: AccountTab[] = [
  { id: 'my-profile', label: 'My Profile' },
  { id: 'appearances', label: 'Appearances' },
  { id: 'following', label: 'Following' },
]

const creatorEventTabs: AccountTab[] = [
  { id: 'my-profile', label: 'My Profile' },
  { id: 'my-events', label: 'My Events' },
  { id: 'following', label: 'Following' },
]

function AccountPage() {
  const { isLoading, session } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [mode, setMode] = useState<AuthMode>('create')
  const [displayName, setDisplayName] = useState('')
  const [accountType, setAccountType] = useState<AccountType | ''>('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<Message | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [signedInAccountType, setSignedInAccountType] =
    useState<AccountType>('fan')
  const [accountTypeStatus, setAccountTypeStatus] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle')
  const [adminRedirectStatus, setAdminRedirectStatus] =
    useState<AdminRedirectStatus>('idle')

  const isCreateMode = mode === 'create'

  useEffect(() => {
    let isMounted = true

    async function routeAdminAccount() {
      if (!session) {
        clearRememberedAdminExit()
        setAdminRedirectStatus('idle')
        return
      }

      if (shouldSkipAdminAutoRoute(session.user.id)) {
        setAdminRedirectStatus('not-admin')
        return
      }

      setAdminRedirectStatus('checking')

      try {
        const isAdmin = await checkCurrentUserIsAdmin()

        if (!isMounted) {
          return
        }

        if (isAdmin) {
          setAdminRedirectStatus('redirecting')
          navigate('/admin', { replace: true })
          return
        }

        setAdminRedirectStatus('not-admin')
      } catch (error) {
        console.error('Admin role check failed during login routing.', error)

        if (isMounted) {
          setAdminRedirectStatus('not-admin')
        }
      }
    }

    void routeAdminAccount()

    return () => {
      isMounted = false
    }
  }, [navigate, session])

  useEffect(() => {
    let isMounted = true

    async function loadAccountType() {
      if (!session) {
        setSignedInAccountType('fan')
        setAccountTypeStatus('idle')
        return
      }

      if (adminRedirectStatus !== 'not-admin') {
        setAccountTypeStatus('idle')
        return
      }

      setAccountTypeStatus('loading')

      try {
        const profile = await fetchUserProfile(session.user.id)

        if (isMounted) {
          setSignedInAccountType(profile.accountType)
          setAccountTypeStatus('ready')
        }
      } catch {
        if (isMounted) {
          setSignedInAccountType('fan')
          setAccountTypeStatus('error')
        }
      }
    }

    void loadAccountType()

    return () => {
      isMounted = false
    }
  }, [adminRedirectStatus, session])

  useEffect(() => {
    if (
      !session ||
      adminRedirectStatus !== 'not-admin' ||
      accountTypeStatus !== 'ready'
    ) {
      return
    }

    if (searchParams.get('tab')) {
      return
    }

    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.set('tab', getDefaultAccountTab(signedInAccountType))
    setSearchParams(nextSearchParams, { replace: true })
  }, [
    accountTypeStatus,
    adminRedirectStatus,
    searchParams,
    session,
    setSearchParams,
    signedInAccountType,
  ])

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode)
    setMessage(null)
    setPassword('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    try {
      if (isCreateMode) {
        if (!accountType) {
          setMessage({
            type: 'error',
            text: 'Choose an account type before creating your account.',
          })
          return
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName.trim(),
              account_type: accountType,
            },
          },
        })

        if (error) {
          throw error
        }

        setMessage({
          type: 'success',
          text: 'Account created. If email confirmation is enabled, check your inbox before logging in.',
        })
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          throw error
        }

        setMessage({
          type: 'success',
          text: 'Logged in successfully.',
        })
      }

      setPassword('')
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleLogout() {
    setIsSubmitting(true)
    setMessage(null)

    const { error } = await supabase.auth.signOut()

    if (error) {
      setMessage({
        type: 'error',
        text: error.message,
      })
    } else {
      clearRememberedAdminExit()
      setMessage({
        type: 'success',
        text: 'Logged out successfully.',
      })
    }

    setIsSubmitting(false)
  }

  if (isLoading) {
    return (
      <section className="account-page">
        <div className="account-card">
          <h2>Account</h2>
          <p>Checking account status...</p>
        </div>
      </section>
    )
  }

  if (session && adminRedirectStatus !== 'not-admin') {
    return (
      <section className="account-page">
        <div className="account-card">
          <h2>Checking account access...</h2>
          <p>
            {adminRedirectStatus === 'redirecting'
              ? 'Opening the Admin Panel.'
              : 'Confirming where to send your account.'}
          </p>
        </div>
      </section>
    )
  }

  if (session) {
    const hasLoadedAccountType =
      accountTypeStatus === 'ready' || accountTypeStatus === 'error'
    const accountTabs = getAccountTabs(signedInAccountType)
    const requestedTab = searchParams.get('tab')
    const activeTab = accountTabs.some((tab) => tab.id === requestedTab)
      ? (requestedTab as AccountTabId)
      : getDefaultAccountTab(signedInAccountType)

    function handleTabChange(tabId: AccountTabId) {
      const nextSearchParams = new URLSearchParams(searchParams)
      nextSearchParams.set('tab', tabId)
      setSearchParams(nextSearchParams)
    }

    return (
      <section className="account-page">
        <div className="account-card">
          <div className="section-heading">
            <h2>You are signed in.</h2>
            <p>{session.user.email ?? 'Signed in'}</p>
            <p>
              Account type:{' '}
              {hasLoadedAccountType
                ? formatAccountType(signedInAccountType)
                : 'Loading...'}
            </p>
            {accountTypeStatus === 'error' ? (
              <p>Account type could not be loaded, so Fan is being used.</p>
            ) : null}
          </div>

          {message ? (
            <p className={`auth-message ${message.type}`}>{message.text}</p>
          ) : null}

          <button
            type="button"
            className="auth-submit-button"
            disabled={isSubmitting}
            onClick={handleLogout}
          >
            {isSubmitting ? 'Logging out...' : 'Log Out'}
          </button>
        </div>

        {hasLoadedAccountType ? (
          <>
            <nav className="account-tab-nav" aria-label="Account sections">
              {accountTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`account-tab-button ${
                    activeTab === tab.id ? 'is-active' : ''
                  }`}
                  onClick={() => handleTabChange(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <div className="account-tab-panel">
              <AccountTabPanel
                accountType={signedInAccountType}
                activeTab={activeTab}
                ownerUserId={session.user.id}
              />
            </div>
          </>
        ) : null}
      </section>
    )
  }

  return (
    <section className="account-page">
      <div className="account-card">
        <header className="section-heading">
          <h2>{isCreateMode ? 'Create Account' : 'Log In'}</h2>
          <p>
            {isCreateMode
              ? 'Join Street Team to start building your live entertainment network.'
              : 'Log in to return to your Street Team account.'}
          </p>
        </header>

        <div className="auth-mode-switch" aria-label="Account form mode">
          <button
            type="button"
            className={isCreateMode ? 'is-active' : ''}
            onClick={() => switchMode('create')}
          >
            Create Account
          </button>
          <button
            type="button"
            className={!isCreateMode ? 'is-active' : ''}
            onClick={() => switchMode('login')}
          >
            Log In
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {isCreateMode ? (
            <>
              <label>
                <span>Display name</span>
                <input
                  type="text"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  required
                />
              </label>

              <fieldset className="account-type-field">
                <legend>Account type</legend>

                <div className="account-type-options">
                  {accountTypeOptions.map((option) => (
                    <label key={option.value}>
                      <input
                        type="radio"
                        name="accountType"
                        value={option.value}
                        checked={accountType === option.value}
                        required
                        onChange={() => setAccountType(option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </>
          ) : null}

          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              autoComplete={isCreateMode ? 'new-password' : 'current-password'}
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {message ? (
            <p className={`auth-message ${message.type}`}>{message.text}</p>
          ) : null}

          <button
            type="submit"
            className="auth-submit-button"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? isCreateMode
                ? 'Creating account...'
                : 'Logging in...'
              : isCreateMode
                ? 'Create Account'
                : 'Log In'}
          </button>
        </form>
      </div>
    </section>
  )
}

function AccountTabPanel({
  accountType,
  activeTab,
  ownerUserId,
}: {
  accountType: AccountType
  activeTab: AccountTabId
  ownerUserId: string
}) {
  if (activeTab === 'following') {
    return <FollowingSection ownerUserId={ownerUserId} />
  }

  if (accountType === 'fan') {
    return activeTab === 'my-tickets' ? (
      <MyTicketsSection ownerUserId={ownerUserId} />
    ) : (
      <MyFanProfileSection ownerUserId={ownerUserId} />
    )
  }

  if (activeTab === 'appearances') {
    return (
      <CreatorOnboardingSection
        accountType={accountType}
        ownerUserId={ownerUserId}
        section="appearances"
      />
    )
  }

  if (activeTab === 'my-events') {
    return (
      <CreatorOnboardingSection
        accountType={accountType}
        ownerUserId={ownerUserId}
        section="events"
      />
    )
  }

  return (
    <CreatorOnboardingSection
      accountType={accountType}
      ownerUserId={ownerUserId}
      section="profile"
    />
  )
}

function getAccountTabs(accountType: AccountType) {
  if (accountType === 'fan') {
    return fanTabs
  }

  if (accountType === 'performer') {
    return performerTabs
  }

  return creatorEventTabs
}

function getDefaultAccountTab(accountType: AccountType): AccountTabId {
  if (accountType === 'fan') {
    return 'my-tickets'
  }

  if (accountType === 'performer') {
    return 'my-profile'
  }

  return 'my-events'
}

export default AccountPage
