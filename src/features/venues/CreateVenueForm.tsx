import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { uploadProfileImage } from '../profile-images/profileImages'
import {
  createVenueProfile,
  isDuplicateSlugError,
  updateVenueImageUrl,
  type Venue,
} from './venues'

type Message = {
  type: 'success' | 'error'
  text: string
}

type CreateVenueFormProps = {
  initialName?: string
  onProfileCreated?: (venue: Venue, message?: Message) => void
  ownerUserId: string
}

function CreateVenueForm({
  initialName = '',
  onProfileCreated,
  ownerUserId,
}: CreateVenueFormProps) {
  const [name, setName] = useState(initialName)
  const [hasEditedName, setHasEditedName] = useState(false)
  const [venueType, setVenueType] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [message, setMessage] = useState<Message | null>(null)
  const [createdVenue, setCreatedVenue] = useState<Venue | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const venueName = hasEditedName ? name : initialName

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage(null)
    setCreatedVenue(null)

    try {
      let venue = await createVenueProfile({
        ownerUserId,
        name: venueName,
        venueType,
        city,
        state,
        description,
      })
      const createWarnings: string[] = []

      if (imageFile) {
        try {
          const imageUrl = await uploadProfileImage({
            file: imageFile,
            ownerUserId,
            profileId: venue.id,
            profileType: 'venue',
          })

          venue = await updateVenueImageUrl(ownerUserId, venue.id, imageUrl)
        } catch (error) {
          createWarnings.push(
            error instanceof Error
              ? `Image could not be uploaded: ${error.message}`
              : 'Image could not be uploaded.',
          )
        }
      }

      const nextMessage: Message = {
        type: createWarnings.length > 0 ? 'error' : 'success',
        text: joinMessage('Venue profile created.', createWarnings),
      }

      setCreatedVenue(venue)
      onProfileCreated?.(venue, nextMessage)
      setMessage(nextMessage)

      setName('')
      setHasEditedName(false)
      setVenueType('')
      setCity('')
      setState('')
      setDescription('')
      setImageFile(null)
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

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    setImageFile(event.currentTarget.files?.[0] ?? null)
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
            value={venueName}
            onChange={(event) => {
              setHasEditedName(true)
              setName(event.target.value)
            }}
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

        <div className="profile-create-upload">
          <span>Venue photo or logo</span>
          <input type="file" accept="image/*" onChange={handleImageChange} />
          <p>
            {imageFile
              ? imageFile.name
              : 'Optional. You can add or replace this image later.'}
          </p>
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

function joinMessage(message: string, warnings: string[]) {
  return warnings.length > 0 ? `${message} ${warnings.join(' ')}` : message
}

export default CreateVenueForm
