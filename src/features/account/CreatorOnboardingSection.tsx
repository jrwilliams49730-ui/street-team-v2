import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react'
import { Link } from 'react-router-dom'
import CreatePerformerForm from '../performers/CreatePerformerForm'
import FeaturedMediaPlayer from '../performers/FeaturedMediaPlayer'
import PerformerSocialLinks from '../performers/PerformerSocialLinks'
import PerformerSocialLinksFields from '../performers/PerformerSocialLinksFields'
import {
  canRenderFeaturedMedia,
  isSoundCloudUrl,
  isYouTubeUrl,
} from '../performers/featuredMediaLinks'
import {
  fetchOwnedPerformers,
  updatePerformerFeaturedMedia,
  updatePerformerImageUrl,
  updatePerformerProfile,
  type FeaturedMediaType,
  type Performer,
  type PerformerSocialLinks as PerformerSocialLinkValues,
} from '../performers/performers'
import CreateProducerForm from '../producers/CreateProducerForm'
import {
  fetchOwnedProducers,
  updateProducerImageUrl,
  updateProducerProfile,
  type Producer,
} from '../producers/producers'
import ProfileImageAvatar from '../profile-images/ProfileImageAvatar'
import {
  uploadProfileImage,
  type ProfileImageType,
} from '../profile-images/profileImages'
import EventManagementSection from './EventManagementSection'
import CreateVenueForm from '../venues/CreateVenueForm'
import {
  fetchOwnedVenues,
  updateVenueImageUrl,
  updateVenueProfile,
  type Venue,
} from '../venues/venues'
import { formatAccountType, type AccountType } from './accountTypes'
import PerformerAppearancesManager from './PerformerAppearancesManager'
import { fetchUserProfile } from './userProfile'

type CreatorOnboardingSectionProps = {
  accountType: AccountType
  ownerUserId: string
  section?: CreatorAccountSection
}

type CreatorAccountSection = 'profile' | 'appearances' | 'events' | 'all'

type CreatorProfile = {
  id: string
  body: string
  bodyFieldLabel: string
  category: string
  categoryFieldLabel: string
  city: string
  featuredMediaType: FeaturedMediaType | null
  featuredMediaUrl: string | null
  imageUrl: string | null
  initials: string
  location: string
  name: string
  profileType: ProfileImageType
  publicPath: string
  socialLinks: PerformerSocialLinkValues | null
  state: string
  typeLabel: string
}

type Message = {
  type: 'success' | 'error' | 'uploading'
  text: string
}

function CreatorOnboardingSection({
  accountType,
  ownerUserId,
  section = 'all',
}: CreatorOnboardingSectionProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [profile, setProfile] = useState<CreatorProfile | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [body, setBody] = useState('')
  const [socialLinks, setSocialLinks] =
    useState<PerformerSocialLinkValues>(getEmptySocialLinks())
  const [featuredMediaType, setFeaturedMediaType] =
    useState<FeaturedMediaType>('video')
  const [featuredMediaUrl, setFeaturedMediaUrl] = useState('')
  const [defaultProfileName, setDefaultProfileName] = useState('')
  const [message, setMessage] = useState<Message | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isMediaSaving, setIsMediaSaving] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  function syncProfileState(nextProfile: CreatorProfile) {
    setProfile(nextProfile)
    setName(nextProfile.name)
    setCategory(nextProfile.category)
    setCity(nextProfile.city)
    setState(nextProfile.state)
    setBody(nextProfile.body)
    setSocialLinks(nextProfile.socialLinks ?? getEmptySocialLinks())
    setFeaturedMediaType(nextProfile.featuredMediaType ?? 'video')
    setFeaturedMediaUrl(nextProfile.featuredMediaUrl ?? '')
  }

  useEffect(() => {
    let isMounted = true

    async function loadMatchingProfileStatus() {
      if (accountType === 'fan') {
        setStatus('ready')
        setProfile(null)
        return
      }

      setStatus('loading')
      setMessage(null)

      try {
        const [matchingProfile, userProfile] = await Promise.all([
          fetchMatchingProfile(accountType, ownerUserId),
          fetchUserProfile(ownerUserId).catch(() => null),
        ])

        if (!isMounted) {
          return
        }

        setDefaultProfileName(userProfile?.displayName ?? '')

        if (matchingProfile) {
          syncProfileState(matchingProfile)
        } else {
          setProfile(null)
          setName(userProfile?.displayName ?? '')
        }

        setIsEditing(false)
        setStatus('ready')
      } catch {
        if (isMounted) {
          setStatus('error')
        }
      }
    }

    void loadMatchingProfileStatus()

    return () => {
      isMounted = false
    }
  }, [accountType, ownerUserId])

  if (accountType === 'fan') {
    return null
  }

  const accountTypeLabel = formatAccountType(accountType)
  const label = accountTypeLabel.toLowerCase()

  function handleProfileCreated(
    nextProfile: CreatorProfile,
    nextMessage?: Message,
  ) {
    syncProfileState(nextProfile)
    setIsEditing(false)
    setMessage(
      nextMessage ?? {
        type: 'success',
        text: `${accountTypeLabel} profile created.`,
      },
    )
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''

    if (!file || !profile) {
      return
    }

    setIsUploading(true)
    setMessage({
      type: 'uploading',
      text: 'Uploading image...',
    })

    try {
      const imageUrl = await uploadProfileImage({
        file,
        ownerUserId,
        profileId: profile.id,
        profileType: profile.profileType,
      })
      const nextProfile = await updateCreatorImageUrl(
        ownerUserId,
        profile,
        imageUrl,
      )

      syncProfileState(nextProfile)
      setMessage({
        type: 'success',
        text: 'Image updated.',
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Image could not be uploaded. Please try again.',
      })
    } finally {
      setIsUploading(false)
    }
  }

  async function handleFeaturedMediaSave() {
    if (!profile || profile.profileType !== 'performer') {
      return
    }

    const cleanUrl = featuredMediaUrl.trim()

    if (!cleanUrl) {
      setMessage({
        type: 'error',
        text: 'Paste a YouTube or SoundCloud link before saving featured media.',
      })
      return
    }

    if (featuredMediaType === 'video' && !isYouTubeUrl(cleanUrl)) {
      setMessage({
        type: 'error',
        text: 'Paste a valid YouTube watch link or youtu.be link.',
      })
      return
    }

    if (featuredMediaType === 'audio' && !isSoundCloudUrl(cleanUrl)) {
      setMessage({
        type: 'error',
        text: 'Paste a valid SoundCloud track or share link.',
      })
      return
    }

    setIsMediaSaving(true)
    setMessage(null)

    try {
      const nextPerformer = await updatePerformerFeaturedMedia(
        ownerUserId,
        profile.id,
        {
          featuredMediaType,
          featuredMediaUrl: cleanUrl,
        },
      )

      syncProfileState(mapPerformerProfile(nextPerformer))
      setMessage({
        type: 'success',
        text: 'Featured media saved.',
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Featured media could not be saved. Please try again.',
      })
    } finally {
      setIsMediaSaving(false)
    }
  }

  async function handleFeaturedMediaClear() {
    if (!profile || profile.profileType !== 'performer') {
      return
    }

    setIsMediaSaving(true)
    setMessage(null)

    try {
      const nextPerformer = await updatePerformerFeaturedMedia(
        ownerUserId,
        profile.id,
        {
          featuredMediaType: null,
          featuredMediaUrl: null,
        },
      )

      syncProfileState(mapPerformerProfile(nextPerformer))
      setMessage({
        type: 'success',
        text: 'Featured media removed.',
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Featured media could not be removed. Please try again.',
      })
    } finally {
      setIsMediaSaving(false)
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!profile) {
      return
    }

    setIsSaving(true)
    setMessage(null)

    try {
      const nextProfile = await updateCreatorProfile(ownerUserId, profile, {
        body,
        category,
        city,
        name,
        state,
        socialLinks:
          profile.profileType === 'performer' ? socialLinks : undefined,
      })

      syncProfileState(nextProfile)
      setIsEditing(false)
      setMessage({
        type: 'success',
        text: `${accountTypeLabel} profile updated.`,
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : `${accountTypeLabel} profile could not be updated. Please try again.`,
      })
    } finally {
      setIsSaving(false)
    }
  }

  function handleEdit() {
    if (profile) {
      syncProfileState(profile)
    }

    setMessage(null)
    setIsEditing(true)
  }

  function handleCancel() {
    if (profile) {
      syncProfileState(profile)
    }

    setMessage(null)
    setIsEditing(false)
  }

  if (status === 'loading') {
    return (
      <section className="account-card onboarding-card">
        <header className="section-heading">
          <h2>{accountTypeLabel} Setup</h2>
          <p>{`Checking your ${label} profile status...`}</p>
        </header>
      </section>
    )
  }

  if (status === 'error') {
    return (
      <section className="account-card onboarding-card">
        <header className="section-heading">
          <h2>{accountTypeLabel} Setup</h2>
          <p>{`Your ${label} profile status could not be loaded.`}</p>
        </header>
      </section>
    )
  }

  if (!profile) {
    if (section !== 'profile' && section !== 'all') {
      return (
        <section className="account-card onboarding-card">
          <header className="section-heading">
            <h2>{accountTypeLabel} Setup Needed</h2>
            <p>{`Create your ${label} profile before managing this area.`}</p>
          </header>
        </section>
      )
    }

    return (
      <>
        <section className="account-card onboarding-card">
          <header className="section-heading">
            <h2>{accountTypeLabel} Setup</h2>
            <p>
              {`Complete your public ${label} profile so fans can discover and follow you.`}
            </p>
          </header>
        </section>

        {renderCreateForm(
          accountType,
          ownerUserId,
          defaultProfileName,
          handleProfileCreated,
        )}
      </>
    )
  }

  return (
    <section className="account-card creator-management-section">
      <header className="section-heading">
        <h2>{getCreatorSectionTitle(accountTypeLabel, section)}</h2>
        <p>{getCreatorSectionDescription(label, section)}</p>
      </header>

      {message && (section === 'profile' || section === 'all') ? (
        <p
          className={`auth-message ${message.type === 'error' ? 'error' : ''}`}
        >
          {message.text}
        </p>
      ) : null}

      {section === 'profile' || section === 'all' ? (
        isEditing ? (
        <>
          <ProfileSummary
            isUploading={isUploading}
            onImageChange={handleImageChange}
            profile={profile}
            showImageUpload
          />

          <form className="auth-form" onSubmit={handleSave}>
            <label>
              <span>{`${accountTypeLabel} name`}</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </label>

            <label>
              <span>{profile.categoryFieldLabel}</span>
              <input
                type="text"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
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
                  onChange={(event) =>
                    setState(event.target.value.toUpperCase())
                  }
                />
              </label>
            </div>

            <label>
              <span>{profile.bodyFieldLabel}</span>
              <textarea
                value={body}
                rows={5}
                onChange={(event) => setBody(event.target.value)}
              />
            </label>

            {profile.profileType === 'performer' ? (
              <PerformerSocialLinksFields
                socialLinks={socialLinks}
                onSocialLinksChange={setSocialLinks}
              />
            ) : null}

            {profile.profileType === 'performer' ? (
              <FeaturedMediaArea
                isEditing
                isSaving={isMediaSaving}
                mediaType={featuredMediaType}
                mediaUrl={featuredMediaUrl}
                onClearMedia={handleFeaturedMediaClear}
                onMediaTypeChange={setFeaturedMediaType}
                onMediaUrlChange={setFeaturedMediaUrl}
                onSaveMedia={handleFeaturedMediaSave}
                profile={profile}
              />
            ) : null}

            <div className="fan-profile-actions">
              <button
                type="submit"
                className="auth-submit-button"
                disabled={isSaving}
              >
                {isSaving ? 'Saving changes...' : 'Save Changes'}
              </button>

              <button
                type="button"
                className="secondary-action-button"
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </form>
        </>
      ) : (
        <div className="owned-profile-card creator-management-card">
          <ProfileSummary
            isUploading={isUploading}
            onImageChange={handleImageChange}
            profile={profile}
            showImageUpload={false}
          />

          {profile.body ? (
            <p className="creator-management-body">{profile.body}</p>
          ) : null}

          {profile.profileType === 'performer' && profile.socialLinks ? (
            <PerformerSocialLinks socialLinks={profile.socialLinks} />
          ) : null}

          {profile.profileType === 'performer' ? (
            <FeaturedMediaArea
              isEditing={false}
              isSaving={isMediaSaving}
              mediaType={featuredMediaType}
              mediaUrl={featuredMediaUrl}
              onClearMedia={handleFeaturedMediaClear}
              onMediaTypeChange={setFeaturedMediaType}
              onMediaUrlChange={setFeaturedMediaUrl}
              onSaveMedia={handleFeaturedMediaSave}
              profile={profile}
            />
          ) : null}

          <div className="creator-management-actions">
            <Link to={profile.publicPath} className="auth-submit-button">
              View public profile
            </Link>

            <button
              type="button"
              className="secondary-action-button"
              onClick={handleEdit}
            >
              Edit Profile
            </button>
          </div>
        </div>
        )
      ) : null}

      {profile.profileType === 'performer' &&
      (section === 'appearances' || section === 'all') ? (
        <PerformerAppearancesManager
          ownerUserId={ownerUserId}
          performerId={profile.id}
        />
      ) : null}

      {(profile.profileType === 'producer' || profile.profileType === 'venue') &&
      (section === 'events' || section === 'all') ? (
        <EventManagementSection
          organizerProfileId={profile.id}
          organizerType={profile.profileType}
          ownerUserId={ownerUserId}
        />
      ) : null}
    </section>
  )
}

function getCreatorSectionTitle(
  accountTypeLabel: string,
  section: CreatorAccountSection,
) {
  if (section === 'appearances') {
    return 'Appearances'
  }

  if (section === 'events') {
    return 'My Events'
  }

  return `Your ${accountTypeLabel} Profile`
}

function getCreatorSectionDescription(
  label: string,
  section: CreatorAccountSection,
) {
  if (section === 'appearances') {
    return 'Manage your performer appearances and tour dates.'
  }

  if (section === 'events') {
    return 'Create and manage official Street Team events.'
  }

  return `Manage the public ${label} profile fans see across Street Team.`
}

type FeaturedMediaAreaProps = {
  isEditing: boolean
  isSaving: boolean
  mediaType: FeaturedMediaType
  mediaUrl: string
  onClearMedia: () => void
  onMediaTypeChange: (mediaType: FeaturedMediaType) => void
  onMediaUrlChange: (mediaUrl: string) => void
  onSaveMedia: () => void
  profile: CreatorProfile
}

function FeaturedMediaArea({
  isEditing,
  isSaving,
  mediaType,
  mediaUrl,
  onClearMedia,
  onMediaTypeChange,
  onMediaUrlChange,
  onSaveMedia,
  profile,
}: FeaturedMediaAreaProps) {
  const hasSavedFeaturedMedia = Boolean(
    profile.featuredMediaUrl && profile.featuredMediaType,
  )
  const canPreviewFeaturedMedia = canRenderFeaturedMedia(
    profile.featuredMediaUrl,
    profile.featuredMediaType,
  )

  return (
    <div className="creator-featured-media">
      <div className="creator-featured-media-heading">
        <h3>Featured Media</h3>
        <p>
          {hasSavedFeaturedMedia
            ? 'Your featured media is visible on your public performer profile.'
            : 'No featured media added yet.'}
        </p>
      </div>

      {canPreviewFeaturedMedia &&
      profile.featuredMediaUrl &&
      profile.featuredMediaType ? (
        <FeaturedMediaPlayer
          mediaType={profile.featuredMediaType}
          mediaUrl={profile.featuredMediaUrl}
        />
      ) : null}

      {isEditing ? (
        <div className="featured-media-link-form">
          <fieldset className="featured-media-choice">
            <legend>Media type</legend>

            <div className="featured-media-options">
              <label>
                <input
                  type="radio"
                  name="featuredMediaType"
                  checked={mediaType === 'video'}
                  onChange={() => onMediaTypeChange('video')}
                />
                <span>YouTube Video</span>
              </label>

              <label>
                <input
                  type="radio"
                  name="featuredMediaType"
                  checked={mediaType === 'audio'}
                  onChange={() => onMediaTypeChange('audio')}
                />
                <span>SoundCloud Audio</span>
              </label>
            </div>
          </fieldset>

          <label className="featured-media-url-field">
            <span>{mediaType === 'video' ? 'YouTube URL' : 'SoundCloud URL'}</span>
            <input
              type="text"
              value={mediaUrl}
              placeholder={
                mediaType === 'video'
                  ? 'https://www.youtube.com/watch?v=...'
                  : 'https://soundcloud.com/artist/track'
              }
              onChange={(event) => onMediaUrlChange(event.target.value)}
            />
          </label>

          <p className="featured-media-helper">
            {mediaType === 'video'
              ? 'Paste a youtube.com/watch link or a youtu.be link.'
              : 'Paste a SoundCloud track or share link.'}
          </p>

          <div className="featured-media-actions">
            <button
              type="button"
              className="auth-submit-button"
              disabled={isSaving}
              onClick={onSaveMedia}
            >
              {isSaving ? 'Saving media...' : 'Save Featured Media'}
            </button>

            {hasSavedFeaturedMedia ? (
              <button
                type="button"
                className="secondary-action-button"
                disabled={isSaving}
                onClick={onClearMedia}
              >
                Remove Media
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}

type ProfileSummaryProps = {
  isUploading: boolean
  onImageChange: (event: ChangeEvent<HTMLInputElement>) => void
  profile: CreatorProfile
  showImageUpload: boolean
}

function ProfileSummary({
  isUploading,
  onImageChange,
  profile,
  showImageUpload,
}: ProfileSummaryProps) {
  return (
    <div className="owned-profile-main">
      <ProfileImageAvatar
        className={`owned-profile-avatar ${profile.profileType}-avatar`}
        imageUrl={profile.imageUrl}
        initials={profile.initials}
        name={profile.name}
      />

      <div className="owned-profile-copy">
        <span>{profile.typeLabel}</span>
        <h3>{profile.name}</h3>
        <p>{profile.category}</p>
        <p>{profile.location}</p>

        {showImageUpload ? (
          <label
            className={`profile-upload-button ${
              isUploading ? 'is-disabled' : ''
            }`}
          >
            <input
              type="file"
              accept="image/*"
              disabled={isUploading}
              onChange={onImageChange}
            />
            {isUploading
              ? 'Uploading...'
              : profile.imageUrl
                ? 'Replace image'
                : 'Upload image'}
          </label>
        ) : null}
      </div>
    </div>
  )
}

function renderCreateForm(
  accountType: AccountType,
  ownerUserId: string,
  defaultProfileName: string,
  onProfileCreated: (profile: CreatorProfile, message?: Message) => void,
) {
  if (accountType === 'performer') {
    return (
      <CreatePerformerForm
        initialName={defaultProfileName}
        ownerUserId={ownerUserId}
        onProfileCreated={(performer, message) =>
          onProfileCreated(mapPerformerProfile(performer), message)
        }
      />
    )
  }

  if (accountType === 'producer') {
    return (
      <CreateProducerForm
        initialName={defaultProfileName}
        ownerUserId={ownerUserId}
        onProfileCreated={(producer, message) =>
          onProfileCreated(mapProducerProfile(producer), message)
        }
      />
    )
  }

  if (accountType === 'venue') {
    return (
      <CreateVenueForm
        initialName={defaultProfileName}
        ownerUserId={ownerUserId}
        onProfileCreated={(venue, message) =>
          onProfileCreated(mapVenueProfile(venue), message)
        }
      />
    )
  }

  return null
}

async function fetchMatchingProfile(
  accountType: AccountType,
  ownerUserId: string,
) {
  if (accountType === 'performer') {
    const performers = await fetchOwnedPerformers(ownerUserId)

    return performers[0] ? mapPerformerProfile(performers[0]) : null
  }

  if (accountType === 'producer') {
    const producers = await fetchOwnedProducers(ownerUserId)

    return producers[0] ? mapProducerProfile(producers[0]) : null
  }

  if (accountType === 'venue') {
    const venues = await fetchOwnedVenues(ownerUserId)

    return venues[0] ? mapVenueProfile(venues[0]) : null
  }

  return null
}

async function updateCreatorImageUrl(
  ownerUserId: string,
  profile: CreatorProfile,
  imageUrl: string,
) {
  if (profile.profileType === 'performer') {
    return mapPerformerProfile(
      await updatePerformerImageUrl(ownerUserId, profile.id, imageUrl),
    )
  }

  if (profile.profileType === 'producer') {
    return mapProducerProfile(
      await updateProducerImageUrl(ownerUserId, profile.id, imageUrl),
    )
  }

  return mapVenueProfile(
    await updateVenueImageUrl(ownerUserId, profile.id, imageUrl),
  )
}

type CreatorProfileFormState = {
  body: string
  category: string
  city: string
  name: string
  socialLinks?: PerformerSocialLinkValues
  state: string
}

async function updateCreatorProfile(
  ownerUserId: string,
  profile: CreatorProfile,
  formState: CreatorProfileFormState,
) {
  if (profile.profileType === 'performer') {
    return mapPerformerProfile(
      await updatePerformerProfile(ownerUserId, profile.id, {
        bio: formState.body,
        city: formState.city,
        name: formState.name,
        performerType: formState.category,
        socialLinks: formState.socialLinks,
        state: formState.state,
      }),
    )
  }

  if (profile.profileType === 'producer') {
    return mapProducerProfile(
      await updateProducerProfile(ownerUserId, profile.id, {
        bio: formState.body,
        city: formState.city,
        name: formState.name,
        producerType: formState.category,
        state: formState.state,
      }),
    )
  }

  return mapVenueProfile(
    await updateVenueProfile(ownerUserId, profile.id, {
      city: formState.city,
      description: formState.body,
      name: formState.name,
      state: formState.state,
      venueType: formState.category,
    }),
  )
}

function mapPerformerProfile(performer: Performer): CreatorProfile {
  return {
    id: performer.id,
    body: performer.bio,
    bodyFieldLabel: 'Bio',
    category: performer.category,
    categoryFieldLabel: 'Performer type/category',
    city: performer.city,
    featuredMediaType: performer.featuredMediaType,
    featuredMediaUrl: performer.featuredMediaUrl,
    imageUrl: performer.imageUrl,
    initials: performer.initials,
    location: performer.location,
    name: performer.name,
    profileType: 'performer',
    publicPath: `/performers/${performer.slug}`,
    socialLinks: performer.socialLinks,
    state: performer.state,
    typeLabel: 'Performer',
  }
}

function mapProducerProfile(producer: Producer): CreatorProfile {
  return {
    id: producer.id,
    body: producer.bio,
    bodyFieldLabel: 'Bio',
    category: producer.category,
    categoryFieldLabel: 'Producer type/category',
    city: producer.city,
    featuredMediaType: null,
    featuredMediaUrl: null,
    imageUrl: producer.imageUrl,
    initials: producer.initials,
    location: producer.location,
    name: producer.name,
    profileType: 'producer',
    publicPath: `/producers/${producer.slug}`,
    socialLinks: null,
    state: producer.state,
    typeLabel: 'Producer',
  }
}

function mapVenueProfile(venue: Venue): CreatorProfile {
  return {
    id: venue.id,
    body: venue.description,
    bodyFieldLabel: 'Description',
    category: venue.category,
    categoryFieldLabel: 'Venue type/category',
    city: venue.city,
    featuredMediaType: null,
    featuredMediaUrl: null,
    imageUrl: venue.imageUrl,
    initials: venue.initials,
    location: venue.location,
    name: venue.name,
    profileType: 'venue',
    publicPath: `/venues/${venue.slug}`,
    socialLinks: null,
    state: venue.state,
    typeLabel: 'Venue',
  }
}

function getEmptySocialLinks(): PerformerSocialLinkValues {
  return {
    facebook: '',
    instagram: '',
    tiktok: '',
    website: '',
    youtube: '',
  }
}

export default CreatorOnboardingSection
