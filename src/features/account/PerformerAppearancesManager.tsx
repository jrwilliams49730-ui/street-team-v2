import { useEffect, useState, type FormEvent } from 'react'
import PerformerAppearanceCard from '../performers/PerformerAppearanceCard'
import {
  createPerformerAppearance,
  deletePerformerAppearance,
  fetchUpcomingPerformerAppearances,
  getTodayDateString,
  isUpcomingAppearance,
  sortPerformerAppearances,
  updatePerformerAppearance,
  type PerformerAppearance,
  type SavePerformerAppearanceInput,
} from '../performers/performerAppearances'

type PerformerAppearancesManagerProps = {
  ownerUserId: string
  performerId: string
}

type AppearanceFormState = SavePerformerAppearanceInput

type AppearanceMessage = {
  type: 'success' | 'error'
  text: string
}

const emptyAppearanceForm: AppearanceFormState = {
  appearanceDate: '',
  appearanceTime: '',
  notes: '',
  ticketUrl: '',
  title: '',
  venueCity: '',
  venueName: '',
  venueState: '',
}

function PerformerAppearancesManager({
  ownerUserId,
  performerId,
}: PerformerAppearancesManagerProps) {
  const [appearances, setAppearances] = useState<PerformerAppearance[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [formState, setFormState] =
    useState<AppearanceFormState>(emptyAppearanceForm)
  const [editFormState, setEditFormState] =
    useState<AppearanceFormState>(emptyAppearanceForm)
  const [editingAppearanceId, setEditingAppearanceId] = useState<string | null>(
    null,
  )
  const [message, setMessage] = useState<AppearanceMessage | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [savingAppearanceId, setSavingAppearanceId] = useState<string | null>(
    null,
  )
  const [deletingAppearanceId, setDeletingAppearanceId] = useState<
    string | null
  >(null)

  useEffect(() => {
    let isMounted = true

    async function loadAppearances() {
      setStatus('loading')

      try {
        const nextAppearances =
          await fetchUpcomingPerformerAppearances(performerId)

        if (isMounted) {
          setAppearances(nextAppearances)
          setStatus('ready')
        }
      } catch {
        if (isMounted) {
          setStatus('error')
        }
      }
    }

    void loadAppearances()

    return () => {
      isMounted = false
    }
  }, [performerId])

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsCreating(true)
    setMessage(null)

    try {
      const nextAppearance = await createPerformerAppearance({
        ...formState,
        ownerUserId,
        performerId,
      })

      setAppearances((currentAppearances) =>
        sortPerformerAppearances([
          nextAppearance,
          ...currentAppearances,
        ]).filter(isUpcomingAppearance),
      )
      setFormState(emptyAppearanceForm)
      setStatus('ready')
      setMessage({
        type: 'success',
        text: 'Appearance added.',
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Appearance could not be added. Please try again.',
      })
    } finally {
      setIsCreating(false)
    }
  }

  function handleEditStart(appearance: PerformerAppearance) {
    setEditingAppearanceId(appearance.id)
    setEditFormState(getFormStateFromAppearance(appearance))
    setMessage(null)
  }

  function handleEditCancel() {
    setEditingAppearanceId(null)
    setEditFormState(emptyAppearanceForm)
    setMessage(null)
  }

  async function handleEditSave(
    event: FormEvent<HTMLFormElement>,
    appearanceId: string,
  ) {
    event.preventDefault()
    setSavingAppearanceId(appearanceId)
    setMessage(null)

    try {
      const updatedAppearance = await updatePerformerAppearance(
        ownerUserId,
        appearanceId,
        editFormState,
      )

      setAppearances((currentAppearances) =>
        sortPerformerAppearances(
          currentAppearances
            .map((appearance) =>
              appearance.id === appearanceId ? updatedAppearance : appearance,
            )
            .filter(isUpcomingAppearance),
        ),
      )
      setEditingAppearanceId(null)
      setEditFormState(emptyAppearanceForm)
      setMessage({
        type: 'success',
        text: 'Appearance updated.',
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Appearance could not be updated. Please try again.',
      })
    } finally {
      setSavingAppearanceId(null)
    }
  }

  async function handleDelete(appearance: PerformerAppearance) {
    const shouldDelete = window.confirm(
      `Delete ${appearance.title || appearance.venueName}?`,
    )

    if (!shouldDelete) {
      return
    }

    setDeletingAppearanceId(appearance.id)
    setMessage(null)

    try {
      await deletePerformerAppearance(ownerUserId, appearance.id)
      setAppearances((currentAppearances) =>
        currentAppearances.filter(
          (currentAppearance) => currentAppearance.id !== appearance.id,
        ),
      )
      setMessage({
        type: 'success',
        text: 'Appearance deleted.',
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Appearance could not be deleted. Please try again.',
      })
    } finally {
      setDeletingAppearanceId(null)
    }
  }

  return (
    <div className="appearance-management">
      <header className="appearance-management-heading">
        <h3>Upcoming Appearances</h3>
        <p>Add tour dates, shows, and public appearances to your performer page.</p>
      </header>

      <form className="auth-form appearance-form" onSubmit={handleCreate}>
        <label>
          <span>Show title or appearance title</span>
          <input
            type="text"
            value={formState.title}
            onChange={(event) =>
              setFormState((currentState) => ({
                ...currentState,
                title: event.target.value,
              }))
            }
          />
        </label>

        <label>
          <span>Venue name</span>
          <input
            type="text"
            value={formState.venueName}
            onChange={(event) =>
              setFormState((currentState) => ({
                ...currentState,
                venueName: event.target.value,
              }))
            }
            required
          />
        </label>

        <div className="form-grid">
          <label>
            <span>Venue city</span>
            <input
              type="text"
              value={formState.venueCity}
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  venueCity: event.target.value,
                }))
              }
            />
          </label>

          <label>
            <span>Venue state</span>
            <input
              type="text"
              value={formState.venueState}
              maxLength={2}
              placeholder="TX"
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  venueState: event.target.value.toUpperCase(),
                }))
              }
            />
          </label>
        </div>

        <div className="form-grid appearance-date-time-grid">
          <label>
            <span>Appearance date</span>
            <input
              type="date"
              value={formState.appearanceDate}
              min={getTodayDateString()}
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  appearanceDate: event.target.value,
                }))
              }
              required
            />
          </label>

          <label>
            <span>Appearance time</span>
            <input
              type="time"
              value={formState.appearanceTime}
              onChange={(event) =>
                setFormState((currentState) => ({
                  ...currentState,
                  appearanceTime: event.target.value,
                }))
              }
            />
          </label>
        </div>

        <label>
          <span>External ticket link</span>
          <input
            type="text"
            value={formState.ticketUrl}
            placeholder="https://tickets.example.com"
            onChange={(event) =>
              setFormState((currentState) => ({
                ...currentState,
                ticketUrl: event.target.value,
              }))
            }
          />
        </label>

        <label>
          <span>Notes</span>
          <textarea
            value={formState.notes}
            rows={4}
            onChange={(event) =>
              setFormState((currentState) => ({
                ...currentState,
                notes: event.target.value,
              }))
            }
          />
        </label>

        <button
          type="submit"
          className="auth-submit-button"
          disabled={isCreating}
        >
          {isCreating ? 'Adding appearance...' : 'Add Appearance'}
        </button>
      </form>

      {message ? (
        <p className={`auth-message ${message.type}`}>{message.text}</p>
      ) : null}

      <div className="appearance-list">
        {status === 'loading' ? <p>Loading upcoming appearances...</p> : null}

        {status === 'error' ? (
          <p>Upcoming appearances could not be loaded.</p>
        ) : null}

        {status === 'ready' && appearances.length === 0 ? (
          <p>No upcoming appearances listed yet.</p>
        ) : null}

        {status === 'ready'
          ? appearances.map((appearance) =>
              editingAppearanceId === appearance.id ? (
                <AppearanceEditForm
                  key={appearance.id}
                  appearanceId={appearance.id}
                  formState={editFormState}
                  isSaving={savingAppearanceId === appearance.id}
                  onCancel={handleEditCancel}
                  onFormChange={setEditFormState}
                  onSave={handleEditSave}
                />
              ) : (
                <PerformerAppearanceCard
                  key={appearance.id}
                  appearance={appearance}
                  actions={
                    <>
                      <button
                        type="button"
                        className="secondary-action-button"
                        onClick={() => handleEditStart(appearance)}
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        className="secondary-action-button"
                        disabled={deletingAppearanceId === appearance.id}
                        onClick={() => {
                          void handleDelete(appearance)
                        }}
                      >
                        {deletingAppearanceId === appearance.id
                          ? 'Deleting...'
                          : 'Delete'}
                      </button>
                    </>
                  }
                />
              ),
            )
          : null}
      </div>
    </div>
  )
}

type AppearanceEditFormProps = {
  appearanceId: string
  formState: AppearanceFormState
  isSaving: boolean
  onCancel: () => void
  onFormChange: (formState: AppearanceFormState) => void
  onSave: (event: FormEvent<HTMLFormElement>, appearanceId: string) => void
}

function AppearanceEditForm({
  appearanceId,
  formState,
  isSaving,
  onCancel,
  onFormChange,
  onSave,
}: AppearanceEditFormProps) {
  return (
    <article className="appearance-card appearance-edit-card">
      <form
        className="auth-form appearance-form"
        onSubmit={(event) => onSave(event, appearanceId)}
      >
        <label>
          <span>Show title or appearance title</span>
          <input
            type="text"
            value={formState.title}
            onChange={(event) =>
              onFormChange({
                ...formState,
                title: event.target.value,
              })
            }
          />
        </label>

        <label>
          <span>Venue name</span>
          <input
            type="text"
            value={formState.venueName}
            onChange={(event) =>
              onFormChange({
                ...formState,
                venueName: event.target.value,
              })
            }
            required
          />
        </label>

        <div className="form-grid">
          <label>
            <span>Venue city</span>
            <input
              type="text"
              value={formState.venueCity}
              onChange={(event) =>
                onFormChange({
                  ...formState,
                  venueCity: event.target.value,
                })
              }
            />
          </label>

          <label>
            <span>Venue state</span>
            <input
              type="text"
              value={formState.venueState}
              maxLength={2}
              placeholder="TX"
              onChange={(event) =>
                onFormChange({
                  ...formState,
                  venueState: event.target.value.toUpperCase(),
                })
              }
            />
          </label>
        </div>

        <div className="form-grid appearance-date-time-grid">
          <label>
            <span>Appearance date</span>
            <input
              type="date"
              value={formState.appearanceDate}
              min={getTodayDateString()}
              onChange={(event) =>
                onFormChange({
                  ...formState,
                  appearanceDate: event.target.value,
                })
              }
              required
            />
          </label>

          <label>
            <span>Appearance time</span>
            <input
              type="time"
              value={formState.appearanceTime}
              onChange={(event) =>
                onFormChange({
                  ...formState,
                  appearanceTime: event.target.value,
                })
              }
            />
          </label>
        </div>

        <label>
          <span>External ticket link</span>
          <input
            type="text"
            value={formState.ticketUrl}
            placeholder="https://tickets.example.com"
            onChange={(event) =>
              onFormChange({
                ...formState,
                ticketUrl: event.target.value,
              })
            }
          />
        </label>

        <label>
          <span>Notes</span>
          <textarea
            value={formState.notes}
            rows={4}
            onChange={(event) =>
              onFormChange({
                ...formState,
                notes: event.target.value,
              })
            }
          />
        </label>

        <div className="fan-profile-actions">
          <button
            type="submit"
            className="auth-submit-button"
            disabled={isSaving}
          >
            {isSaving ? 'Saving appearance...' : 'Save Appearance'}
          </button>

          <button
            type="button"
            className="secondary-action-button"
            disabled={isSaving}
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </form>
    </article>
  )
}

function getFormStateFromAppearance(
  appearance: PerformerAppearance,
): AppearanceFormState {
  return {
    appearanceDate: appearance.appearanceDate,
    appearanceTime: appearance.appearanceTime.slice(0, 5),
    notes: appearance.notes,
    ticketUrl: appearance.ticketUrl,
    title: appearance.title,
    venueCity: appearance.venueCity,
    venueName: appearance.venueName,
    venueState: appearance.venueState,
  }
}

export default PerformerAppearancesManager
