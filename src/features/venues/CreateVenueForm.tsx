import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  createVenueProfile,
  isDuplicateSlugError,
  type Venue,
} from './venues'

type Message = {
  type: 'success' | 'error'
  text: string
}

type CreateVenueFormProps = {
  onProfileCreated?: (venue: Venue) => void
  ownerUserId: string
}

function CreateVenueForm({
  onProfileCreated,
  ownerUserId,
}: CreateVenueFormProps) {
  const [name, setName] = useState('')
  const [venueType, setVenueType] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState<Message | null>(null)
  const [createdVenue, setCreatedVenue] = useState<Venue | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage(null)
    setCreatedVenue(null)

    try {
      const venue = await createVenueProfile({
        ownerUserId,
        name,
        venueType,
        city,
        state,
        description,
      })

      setCreatedVenue(venue)
      onProfileCreated?.(venue)
      setMessage({
        type: 'success',
        text: 'Venue profile created.',
      })

      setName('')
      setVenueType('')
      setCity('')
      setState('')
      setDescription('')
    } catch (error) {
      setMessage({
        type: 'error',
        text: isDuplicateSlugError(error)
          ? 'A venue with that name or URL already exists. Slightly adjust the venue name for now.'
          : error instanceof Error
            ? error.message
            : 'Venue profile could not be created. Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="account-card">
      <header className="section-heading">
        <h2>Create Venue Profile</h2>
        <p>Add a public venue profile owned by your account.</p>
      </header>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          <span>Venue name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>

        <label>
          <span>Venue type/category</span>
          <input
            type="text"
            value={venueType}
            placeholder="Comedy club, theater, brewery, music venue..."
            onChange={(event) => setVenueType(event.target.value)}
            required
          />
        </label>

        <div className="form-grid">
          <label>
            <span>City</span>
            <input
              type="text"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            />
          </label>

          <label>
            <span>State</span>
            <input
              type="text"
              value={state}
              maxLength={2}
              placeholder="TX"
              onChange={(event) => setState(event.target.value.toUpperCase())}
            />
          </label>
        </div>

        <label>
          <span>Description</span>
          <textarea
            value={description}
            rows={5}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        {message ? (
          <p className={`auth-message ${message.type}`}>
            {message.text}
            {createdVenue ? (
              <>
                {' '}
                <Link to={`/venues/${createdVenue.slug}`}>
                  View public profile.
                </Link>
              </>
            ) : null}
          </p>
        ) : null}

        <button
          type="submit"
          className="auth-submit-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating venue...' : 'Create Venue Profile'}
        </button>
      </form>
    </div>
  )
}

export default CreateVenueForm
