import { useEffect, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import ProfileImageAvatar from '../profile-images/ProfileImageAvatar'
import {
  uploadProfileImage,
  type ProfileImageType,
} from '../profile-images/profileImages'
import {
  fetchOwnedPerformers,
  updatePerformerImageUrl,
  type Performer,
} from '../performers/performers'
import {
  fetchOwnedProducers,
  updateProducerImageUrl,
  type Producer,
} from '../producers/producers'
import {
  fetchOwnedVenues,
  updateVenueImageUrl,
  type Venue,
} from '../venues/venues'

type OwnedProfile = {
  id: string
  imageUrl: string | null
  initials: string
  name: string
  profileType: ProfileImageType
  publicPath: string
  typeLabel: string
}

type UploadState = {
  type: 'success' | 'error' | 'uploading'
  text: string
}

type MyProfilesSectionProps = {
  hideWhenEmpty?: boolean
  minimumProfilesToShow?: number
  ownerUserId: string
}

function MyProfilesSection({
  hideWhenEmpty = false,
  minimumProfilesToShow = hideWhenEmpty ? 1 : 0,
  ownerUserId,
}: MyProfilesSectionProps) {
  const [profiles, setProfiles] = useState<OwnedProfile[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [uploadStates, setUploadStates] = useState<
    Record<string, UploadState | undefined>
  >({})

  useEffect(() => {
    let isMounted = true

    async function loadOwnedProfiles() {
      setStatus('loading')

      try {
        const [performers, producers, venues] = await Promise.all([
          fetchOwnedPerformers(ownerUserId),
          fetchOwnedProducers(ownerUserId),
          fetchOwnedVenues(ownerUserId),
        ])

        if (!isMounted) {
          return
        }

        setProfiles([
          ...performers.map(mapPerformerProfile),
          ...producers.map(mapProducerProfile),
          ...venues.map(mapVenueProfile),
        ])
        setStatus('ready')
      } catch {
        if (isMounted) {
          setStatus('error')
        }
      }
    }

    void loadOwnedProfiles()

    return () => {
      isMounted = false
    }
  }, [ownerUserId])

  async function handleImageChange(
    profile: OwnedProfile,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''

    if (!file) {
      return
    }

    const profileKey = getProfileKey(profile)
    setUploadStates((current) => ({
      ...current,
      [profileKey]: {
        type: 'uploading',
        text: 'Uploading image...',
      },
    }))

    try {
      const imageUrl = await uploadProfileImage({
        file,
        ownerUserId,
        profileId: profile.id,
        profileType: profile.profileType,
      })
      const updatedProfile = await updateProfileImage(profile, imageUrl)

      setProfiles((currentProfiles) =>
        currentProfiles.map((currentProfile) =>
          getProfileKey(currentProfile) === profileKey
            ? { ...currentProfile, imageUrl: updatedProfile.imageUrl }
            : currentProfile,
        ),
      )
      setUploadStates((current) => ({
        ...current,
        [profileKey]: {
          type: 'success',
          text: 'Image updated.',
        },
      }))
    } catch (error) {
      setUploadStates((current) => ({
        ...current,
        [profileKey]: {
          type: 'error',
          text:
            error instanceof Error
              ? error.message
              : 'Image could not be uploaded. Please try again.',
        },
      }))
    }
  }

  async function updateProfileImage(profile: OwnedProfile, imageUrl: string) {
    if (profile.profileType === 'performer') {
      return updatePerformerImageUrl(ownerUserId, profile.id, imageUrl)
    }

    if (profile.profileType === 'producer') {
      return updateProducerImageUrl(ownerUserId, profile.id, imageUrl)
    }

    return updateVenueImageUrl(ownerUserId, profile.id, imageUrl)
  }

  if (
    minimumProfilesToShow > 0 &&
    (status === 'loading' ||
      status === 'error' ||
      (status === 'ready' && profiles.length < minimumProfilesToShow))
  ) {
    return null
  }

  return (
    <section className="account-card my-profiles-section">
      <header className="section-heading">
        <h2>My Profiles</h2>
        <p>Upload or replace the public image shown on your profiles.</p>
      </header>

      {status === 'loading' ? (
        <p className="owned-profiles-state">Loading your profiles...</p>
      ) : null}

      {status === 'error' ? (
        <p className="owned-profiles-state">
          Your profiles could not be loaded.
        </p>
      ) : null}

      {status === 'ready' && profiles.length === 0 ? (
        <p className="owned-profiles-state">
          Your performer, producer, and venue profiles will appear here.
        </p>
      ) : null}

      {status === 'ready' && profiles.length > 0 ? (
        <div className="owned-profiles-grid">
          {profiles.map((profile) => {
            const profileKey = getProfileKey(profile)
            const uploadState = uploadStates[profileKey]
            const isUploading = uploadState?.type === 'uploading'

            return (
              <article key={profileKey} className="owned-profile-card">
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
                    <Link to={profile.publicPath}>View public profile</Link>
                  </div>
                </div>

                <label
                  className={`profile-upload-button ${
                    isUploading ? 'is-disabled' : ''
                  }`}
                >
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploading}
                    onChange={(event) => {
                      void handleImageChange(profile, event)
                    }}
                  />
                  {isUploading
                    ? 'Uploading...'
                    : profile.imageUrl
                      ? 'Replace image'
                      : 'Upload image'}
                </label>

                {uploadState ? (
                  <p
                    className={`profile-upload-message ${
                      uploadState.type === 'error' ? 'error' : ''
                    }`}
                  >
                    {uploadState.text}
                  </p>
                ) : null}
              </article>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}

function mapPerformerProfile(performer: Performer): OwnedProfile {
  return {
    id: performer.id,
    imageUrl: performer.imageUrl,
    initials: performer.initials,
    name: performer.name,
    profileType: 'performer',
    publicPath: `/performers/${performer.slug}`,
    typeLabel: 'Performer',
  }
}

function mapProducerProfile(producer: Producer): OwnedProfile {
  return {
    id: producer.id,
    imageUrl: producer.imageUrl,
    initials: producer.initials,
    name: producer.name,
    profileType: 'producer',
    publicPath: `/producers/${producer.slug}`,
    typeLabel: 'Producer',
  }
}

function mapVenueProfile(venue: Venue): OwnedProfile {
  return {
    id: venue.id,
    imageUrl: venue.imageUrl,
    initials: venue.initials,
    name: venue.name,
    profileType: 'venue',
    publicPath: `/venues/${venue.slug}`,
    typeLabel: 'Venue',
  }
}

function getProfileKey(profile: OwnedProfile) {
  return `${profile.profileType}-${profile.id}`
}

export default MyProfilesSection
