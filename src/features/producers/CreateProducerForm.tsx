import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { uploadProfileImage } from '../profile-images/profileImages'
import {
  createProducerProfile,
  isDuplicateSlugError,
  updateProducerImageUrl,
  type Producer,
} from './producers'

type Message = {
  type: 'success' | 'error'
  text: string
}

type CreateProducerFormProps = {
  initialName?: string
  onProfileCreated?: (producer: Producer, message?: Message) => void
  ownerUserId: string
}

function CreateProducerForm({
  initialName = '',
  onProfileCreated,
  ownerUserId,
}: CreateProducerFormProps) {
  const [name, setName] = useState(initialName)
  const [hasEditedName, setHasEditedName] = useState(false)
  const [producerType, setProducerType] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [bio, setBio] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [message, setMessage] = useState<Message | null>(null)
  const [createdProducer, setCreatedProducer] = useState<Producer | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const producerName = hasEditedName ? name : initialName

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage(null)
    setCreatedProducer(null)

    try {
      let producer = await createProducerProfile({
        ownerUserId,
        name: producerName,
        producerType,
        city,
        state,
        bio,
      })
      const createWarnings: string[] = []

      if (imageFile) {
        try {
          const imageUrl = await uploadProfileImage({
            file: imageFile,
            ownerUserId,
            profileId: producer.id,
            profileType: 'producer',
          })

          producer = await updateProducerImageUrl(
            ownerUserId,
            producer.id,
            imageUrl,
          )
        } catch (error) {
          createWarnings.push(
            error instanceof Error
              ? `Logo could not be uploaded: ${error.message}`
              : 'Logo could not be uploaded.',
          )
        }
      }

      const nextMessage: Message = {
        type: createWarnings.length > 0 ? 'error' : 'success',
        text: joinMessage('Producer profile created.', createWarnings),
      }

      setCreatedProducer(producer)
      onProfileCreated?.(producer, nextMessage)
      setMessage(nextMessage)

      setName('')
      setHasEditedName(false)
      setProducerType('')
      setCity('')
      setState('')
      setBio('')
      setImageFile(null)
    } catch (error) {
      setMessage({
        type: 'error',
        text: isDuplicateSlugError(error)
          ? 'A producer with that name or URL already exists. Slightly adjust the producer name for now.'
          : error instanceof Error
            ? error.message
            : 'Producer profile could not be created. Please try again.',
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
        <h2>Create Producer Profile</h2>
        <p>Add a public producer profile owned by your account.</p>
      </header>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          <span>Producer name</span>
          <input
            type="text"
            value={producerName}
            onChange={(event) => {
              setHasEditedName(true)
              setName(event.target.value)
            }}
            required
          />
        </label>

        <label>
          <span>Producer type/category</span>
          <input
            type="text"
            value={producerType}
            placeholder="Comedy producer, promoter, festival organizer..."
            onChange={(event) => setProducerType(event.target.value)}
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
          <span>Photo or logo</span>
          <input type="file" accept="image/*" onChange={handleImageChange} />
          <p>
            {imageFile
              ? imageFile.name
              : 'Optional. You can add or replace this image later.'}
          </p>
        </div>

        <label>
          <span>Bio</span>
          <textarea
            value={bio}
            rows={5}
            onChange={(event) => setBio(event.target.value)}
          />
        </label>

        {message ? (
          <p className={`auth-message ${message.type}`}>
            {message.text}
            {createdProducer ? (
              <>
                {' '}
                <Link to={`/app/producers/${createdProducer.slug}`}>
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
          {isSubmitting ? 'Creating producer...' : 'Create Producer Profile'}
        </button>
      </form>
    </div>
  )
}

function joinMessage(message: string, warnings: string[]) {
  return warnings.length > 0 ? `${message} ${warnings.join(' ')}` : message
}

export default CreateProducerForm
