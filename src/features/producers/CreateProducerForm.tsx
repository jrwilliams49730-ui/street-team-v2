import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  createProducerProfile,
  isDuplicateSlugError,
  type Producer,
} from './producers'

type Message = {
  type: 'success' | 'error'
  text: string
}

type CreateProducerFormProps = {
  ownerUserId: string
}

function CreateProducerForm({ ownerUserId }: CreateProducerFormProps) {
  const [name, setName] = useState('')
  const [producerType, setProducerType] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [bio, setBio] = useState('')
  const [message, setMessage] = useState<Message | null>(null)
  const [createdProducer, setCreatedProducer] = useState<Producer | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage(null)
    setCreatedProducer(null)

    try {
      const producer = await createProducerProfile({
        ownerUserId,
        name,
        producerType,
        city,
        state,
        bio,
      })

      setCreatedProducer(producer)
      setMessage({
        type: 'success',
        text: 'Producer profile created.',
      })

      setName('')
      setProducerType('')
      setCity('')
      setState('')
      setBio('')
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
            value={name}
            onChange={(event) => setName(event.target.value)}
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
                <Link to={`/producers/${createdProducer.slug}`}>
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

export default CreateProducerForm
