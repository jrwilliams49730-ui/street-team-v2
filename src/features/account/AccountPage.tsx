import { useState, type FormEvent } from 'react'
import { supabase } from '../../lib/supabase'
import CreatePerformerForm from '../performers/CreatePerformerForm'
import CreateProducerForm from '../producers/CreateProducerForm'
import CreateVenueForm from '../venues/CreateVenueForm'
import { useAuth } from './auth-context'

type AuthMode = 'create' | 'login'
type Message = {
  type: 'success' | 'error'
  text: string
}

function AccountPage() {
  const { isLoading, session } = useAuth()
  const [mode, setMode] = useState<AuthMode>('create')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<Message | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isCreateMode = mode === 'create'

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
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName.trim(),
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

  if (session) {
    return (
      <section className="account-page">
        <div className="account-card">
          <div className="section-heading">
            <h2>You are signed in.</h2>
            <p>{session.user.email ?? 'Signed in'}</p>
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

        <CreatePerformerForm ownerUserId={session.user.id} />
        <CreateProducerForm ownerUserId={session.user.id} />
        <CreateVenueForm ownerUserId={session.user.id} />
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
            <label>
              <span>Display name</span>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
              />
            </label>
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

export default AccountPage
