import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  createPerformerProfile,
  isDuplicateSlugError,
  type PerformerSocialLinks,
  type Performer,
} from './performers'
import PerformerSocialLinksFields from './PerformerSocialLinksFields'

type Message = {
  type: 'success' | 'error'
  text: string
}

type CreatePerformerFormProps = {
  onProfileCreated?: (performer: Performer) => void
  ownerUserId: string
}

const emptySocialLinks: PerformerSocialLinks = {
  facebook: '',
  instagram: '',
  tiktok: '',
  website: '',
  youtube: '',
}

function CreatePerformerForm({
  onProfileCreated,
  ownerUserId,
}: CreatePerformerFormProps) {
  const [name, setName] = useState('')
  const [performerType, setPerformerType] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [bio, setBio] = useState('')
  const [socialLinks, setSocialLinks] =
    useState<PerformerSocialLinks>(emptySocialLinks)
  const [message, setMessage] = useState<Message | null>(null)
  const [createdPerformer, setCreatedPerformer] = useState<Performer | null>(
    null,
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage(null)
    setCreatedPerformer(null)

    try {
      const performer = await createPerformerProfile({
        ownerUserId,
        name,
        performerType,
        city,
        state,
        bio,
        socialLinks,
      })

      setCreatedPerformer(performer)
      onProfileCreated?.(performer)
      setMessage({
        type: 'success',
        text: 'Performer profile created.',
      })

      setName('')
      setPerformerType('')
      setCity('')
      setState('')
      setBio('')
      setSocialLinks(emptySocialLinks)
    } catch (error) {
      setMessage({
        type: 'error',
        text: isDuplicateSlugError(error)
          ? 'A performer with that name or URL already exists. Slightly adjust the performer name for now.'
          : error instanceof Error
            ? error.message
            : 'Performer profile could not be created. Please try again.',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="account-card">
      <header className="section-heading">
        <h2>Create Performer Profile</h2>
        <p>Add a public performer profile owned by your account.</p>
      </header>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          <span>Performer name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </label>

        <label>
          <span>Performer type/category</span>
          <input
            type="text"
            value={performerType}
            placeholder="Comedian, band, DJ, singer/songwriter..."
            onChange={(event) => setPerformerType(event.target.value)}
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

        <PerformerSocialLinksFields
          socialLinks={socialLinks}
          onSocialLinksChange={setSocialLinks}
        />

        {message ? (
          <p className={`auth-message ${message.type}`}>
            {message.text}
            {createdPerformer ? (
              <>
                {' '}
                <Link to={`/performers/${createdPerformer.slug}`}>
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
          {isSubmitting ? 'Creating performer...' : 'Create Performer Profile'}
        </button>
      </form>
    </div>
  )
}

export default CreatePerformerForm
