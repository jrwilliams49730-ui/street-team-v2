import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { uploadProfileImage } from '../profile-images/profileImages'
import {
  createPerformerProfile,
  isDuplicateSlugError,
  updatePerformerFeaturedMedia,
  updatePerformerImageUrl,
  type FeaturedMediaType,
  type Performer,
  type PerformerSocialLinks,
} from './performers'
import {
  isSoundCloudUrl,
  isYouTubeUrl,
} from './featuredMediaLinks'
import PerformerSocialLinksFields from './PerformerSocialLinksFields'

type Message = {
  type: 'success' | 'error'
  text: string
}

type CreatePerformerFormProps = {
  initialName?: string
  onProfileCreated?: (performer: Performer, message?: Message) => void
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
  initialName = '',
  onProfileCreated,
  ownerUserId,
}: CreatePerformerFormProps) {
  const [name, setName] = useState(initialName)
  const [performerType, setPerformerType] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [bio, setBio] = useState('')
  const [socialLinks, setSocialLinks] =
    useState<PerformerSocialLinks>(emptySocialLinks)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [featuredMediaType, setFeaturedMediaType] =
    useState<FeaturedMediaType>('video')
  const [featuredMediaUrl, setFeaturedMediaUrl] = useState('')
  const [message, setMessage] = useState<Message | null>(null)
  const [createdPerformer, setCreatedPerformer] = useState<Performer | null>(
    null,
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const cleanFeaturedMediaUrl = featuredMediaUrl.trim()

    if (
      cleanFeaturedMediaUrl &&
      featuredMediaType === 'video' &&
      !isYouTubeUrl(cleanFeaturedMediaUrl)
    ) {
      setMessage({
        type: 'error',
        text: 'Paste a valid YouTube watch link or youtu.be link.',
      })
      return
    }

    if (
      cleanFeaturedMediaUrl &&
      featuredMediaType === 'audio' &&
      !isSoundCloudUrl(cleanFeaturedMediaUrl)
    ) {
      setMessage({
        type: 'error',
        text: 'Paste a valid SoundCloud track or share link.',
      })
      return
    }

    setIsSubmitting(true)
    setMessage(null)
    setCreatedPerformer(null)

    try {
      let performer = await createPerformerProfile({
        ownerUserId,
        name,
        performerType,
        city,
        state,
        bio,
        socialLinks,
      })
      const createWarnings: string[] = []

      if (imageFile) {
        try {
          const imageUrl = await uploadProfileImage({
            file: imageFile,
            ownerUserId,
            profileId: performer.id,
            profileType: 'performer',
          })

          performer = await updatePerformerImageUrl(
            ownerUserId,
            performer.id,
            imageUrl,
          )
        } catch (error) {
          createWarnings.push(
            error instanceof Error
              ? `Photo could not be uploaded: ${error.message}`
              : 'Photo could not be uploaded.',
          )
        }
      }

      if (cleanFeaturedMediaUrl) {
        try {
          performer = await updatePerformerFeaturedMedia(
            ownerUserId,
            performer.id,
            {
              featuredMediaType,
              featuredMediaUrl: cleanFeaturedMediaUrl,
            },
          )
        } catch (error) {
          createWarnings.push(
            error instanceof Error
              ? `Featured media could not be saved: ${error.message}`
              : 'Featured media could not be saved.',
          )
        }
      }

      const nextMessage: Message = {
        type: createWarnings.length > 0 ? 'error' : 'success',
        text: joinMessage('Performer profile created.', createWarnings),
      }

      setCreatedPerformer(performer)
      onProfileCreated?.(performer, nextMessage)
      setMessage(nextMessage)

      setName(initialName.trim())
      setPerformerType('')
      setCity('')
      setState('')
      setBio('')
      setSocialLinks(emptySocialLinks)
      setImageFile(null)
      setFeaturedMediaType('video')
      setFeaturedMediaUrl('')
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

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    setImageFile(event.currentTarget.files?.[0] ?? null)
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

        <div className="profile-create-upload">
          <span>Profile photo</span>
          <input type="file" accept="image/*" onChange={handleImageChange} />
          <p>
            {imageFile
              ? imageFile.name
              : 'Optional. You can add or replace this photo later.'}
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

        <PerformerSocialLinksFields
          socialLinks={socialLinks}
          onSocialLinksChange={setSocialLinks}
        />

        <div className="creator-featured-media">
          <div className="creator-featured-media-heading">
            <h3>Featured Media</h3>
            <p>Add a YouTube or SoundCloud link now, or add it later.</p>
          </div>

          <fieldset className="featured-media-choice">
            <legend>Media type</legend>

            <div className="featured-media-options">
              <label>
                <input
                  type="radio"
                  name="createFeaturedMediaType"
                  checked={featuredMediaType === 'video'}
                  onChange={() => setFeaturedMediaType('video')}
                />
                <span>YouTube Video</span>
              </label>

              <label>
                <input
                  type="radio"
                  name="createFeaturedMediaType"
                  checked={featuredMediaType === 'audio'}
                  onChange={() => setFeaturedMediaType('audio')}
                />
                <span>SoundCloud Audio</span>
              </label>
            </div>
          </fieldset>

          <label className="featured-media-url-field">
            <span>
              {featuredMediaType === 'video' ? 'YouTube URL' : 'SoundCloud URL'}
            </span>
            <input
              type="text"
              value={featuredMediaUrl}
              placeholder={
                featuredMediaType === 'video'
                  ? 'https://www.youtube.com/watch?v=...'
                  : 'https://soundcloud.com/artist/track'
              }
              onChange={(event) => setFeaturedMediaUrl(event.target.value)}
            />
          </label>
        </div>

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

function joinMessage(message: string, warnings: string[]) {
  return warnings.length > 0 ? `${message} ${warnings.join(' ')}` : message
}

export default CreatePerformerForm
