import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import ProfileImageAvatar from '../profile-images/ProfileImageAvatar'
import { uploadFanProfileImage } from '../profile-images/profileImages'
import {
  fetchUserProfile,
  updateUserProfile,
  updateUserProfileAvatarUrl,
  type UserProfile,
} from './userProfile'

type Message = {
  type: 'success' | 'error'
  text: string
}

type MyFanProfileSectionProps = {
  ownerUserId: string
}

function MyFanProfileSection({ ownerUserId }: MyFanProfileSectionProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [bio, setBio] = useState('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [message, setMessage] = useState<Message | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isEditing, setIsEditing] = useState(true)
  const [hasSavedProfile, setHasSavedProfile] = useState(false)

  function syncProfileState(nextProfile: UserProfile) {
    setProfile(nextProfile)
    setDisplayName(nextProfile.displayName)
    setCity(nextProfile.city)
    setState(nextProfile.state)
    setBio(nextProfile.bio)
  }

  useEffect(() => {
    let isMounted = true

    async function loadProfile() {
      setStatus('loading')

      try {
        const nextProfile = await fetchUserProfile(ownerUserId)

        if (!isMounted) {
          return
        }

        syncProfileState(nextProfile)
        setIsEditing(!isFanProfileComplete(nextProfile))
        setHasSavedProfile(false)
        setStatus('ready')
      } catch {
        if (isMounted) {
          setStatus('error')
        }
      }
    }

    void loadProfile()

    return () => {
      isMounted = false
    }
  }, [ownerUserId])

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setMessage(null)

    try {
      const nextProfile = await updateUserProfile(ownerUserId, {
        displayName,
        city,
        state,
        bio,
      })

      syncProfileState(nextProfile)
      setHasSavedProfile(true)
      setIsEditing(false)
      setMessage({
        type: 'success',
        text: 'Fan profile saved.',
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Fan profile could not be saved. Please try again.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''

    if (!file) {
      return
    }

    setIsUploading(true)
    setMessage(null)

    try {
      const avatarUrl = await uploadFanProfileImage(file, ownerUserId)
      const nextProfile = await updateUserProfileAvatarUrl(
        ownerUserId,
        avatarUrl,
      )

      syncProfileState(nextProfile)
      setMessage({
        type: 'success',
        text: 'Profile photo updated.',
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : 'Profile photo could not be uploaded. Please try again.',
      })
    } finally {
      setIsUploading(false)
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

  return (
    <section className="account-card fan-profile-section">
      <header className="section-heading">
        <h2>My Fan Profile</h2>
        <p>Your base Street Team profile for following and supporting creators.</p>
      </header>

      {status === 'loading' ? (
        <p className="fan-profile-state">Loading your fan profile...</p>
      ) : null}

      {status === 'error' ? (
        <p className="fan-profile-state">
          Your fan profile could not be loaded.
        </p>
      ) : null}

      {status === 'ready' && profile ? (
        <>
          {message ? (
            <p className={`auth-message ${message.type}`}>{message.text}</p>
          ) : null}

          {isEditing ? (
            <>
              <div className="fan-profile-photo-row">
                <ProfileImageAvatar
                  className="fan-profile-avatar"
                  imageUrl={profile.avatarUrl}
                  initials={profile.initials}
                  name={profile.displayName}
                />

                <div className="fan-profile-photo-copy">
                  <h3>{profile.displayName}</h3>
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
                        void handleAvatarChange(event)
                      }}
                    />
                    {isUploading
                      ? 'Uploading...'
                      : profile.avatarUrl
                        ? 'Replace photo'
                        : 'Upload photo'}
                  </label>
                </div>
              </div>

              <form className="auth-form" onSubmit={handleSave}>
                <label>
                  <span>Display name</span>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
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
                  <span>Bio</span>
                  <textarea
                    value={bio}
                    rows={5}
                    onChange={(event) => setBio(event.target.value)}
                  />
                </label>

                <div className="fan-profile-actions">
                  <button
                    type="submit"
                    className="auth-submit-button"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving profile...' : 'Save Profile'}
                  </button>

                  {hasSavedProfile || isFanProfileComplete(profile) ? (
                    <button
                      type="button"
                      className="secondary-action-button"
                      onClick={handleCancel}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              </form>
            </>
          ) : (
            <div className="fan-profile-summary">
              <ProfileImageAvatar
                className="fan-profile-avatar"
                imageUrl={profile.avatarUrl}
                initials={profile.initials}
                name={profile.displayName}
              />

              <div className="fan-profile-summary-copy">
                <h3>{profile.displayName}</h3>

                {formatLocation(profile) ? (
                  <p>{formatLocation(profile)}</p>
                ) : null}

                {profile.bio ? <p>{profile.bio}</p> : null}

                <button
                  type="button"
                  className="auth-submit-button"
                  onClick={handleEdit}
                >
                  Edit Profile
                </button>
              </div>
            </div>
          )}
        </>
      ) : null}
    </section>
  )
}

function isFanProfileComplete(profile: UserProfile) {
  return Boolean(
    profile.avatarUrl ||
      profile.bio.trim() ||
      profile.city.trim() ||
      profile.state.trim(),
  )
}

function formatLocation(profile: UserProfile) {
  return [profile.city, profile.state]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ')
}

export default MyFanProfileSection
