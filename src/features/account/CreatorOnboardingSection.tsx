import { useEffect, useState } from 'react'
import CreatePerformerForm from '../performers/CreatePerformerForm'
import { fetchOwnedPerformers } from '../performers/performers'
import CreateProducerForm from '../producers/CreateProducerForm'
import { fetchOwnedProducers } from '../producers/producers'
import CreateVenueForm from '../venues/CreateVenueForm'
import { fetchOwnedVenues } from '../venues/venues'
import { formatAccountType, type AccountType } from './accountTypes'

type CreatorOnboardingSectionProps = {
  accountType: AccountType
  ownerUserId: string
}

function CreatorOnboardingSection({
  accountType,
  ownerUserId,
}: CreatorOnboardingSectionProps) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  )
  const [hasMatchingProfile, setHasMatchingProfile] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadMatchingProfileStatus() {
      if (accountType === 'fan') {
        setStatus('ready')
        setHasMatchingProfile(false)
        return
      }

      setStatus('loading')

      try {
        const matchingProfiles = await fetchMatchingProfiles(
          accountType,
          ownerUserId,
        )

        if (isMounted) {
          setHasMatchingProfile(matchingProfiles.length > 0)
          setStatus('ready')
        }
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

  const label = formatAccountType(accountType).toLowerCase()

  return (
    <>
      <section className="account-card onboarding-card">
        <header className="section-heading">
          <h2>{formatAccountType(accountType)} Setup</h2>
          <p>
            {status === 'loading'
              ? `Checking your ${label} profile status...`
              : null}
            {status === 'error'
              ? `Your ${label} profile status could not be loaded.`
              : null}
            {status === 'ready' && hasMatchingProfile
              ? `Your ${label} profile is ready.`
              : null}
            {status === 'ready' && !hasMatchingProfile
              ? `Complete your public ${label} profile so fans can discover and follow you.`
              : null}
          </p>
        </header>
      </section>

      {status === 'ready' && !hasMatchingProfile
        ? renderCreateForm(accountType, ownerUserId)
        : null}
    </>
  )
}

function renderCreateForm(accountType: AccountType, ownerUserId: string) {
  if (accountType === 'performer') {
    return <CreatePerformerForm ownerUserId={ownerUserId} />
  }

  if (accountType === 'producer') {
    return <CreateProducerForm ownerUserId={ownerUserId} />
  }

  if (accountType === 'venue') {
    return <CreateVenueForm ownerUserId={ownerUserId} />
  }

  return null
}

async function fetchMatchingProfiles(
  accountType: AccountType,
  ownerUserId: string,
) {
  if (accountType === 'performer') {
    return fetchOwnedPerformers(ownerUserId)
  }

  if (accountType === 'producer') {
    return fetchOwnedProducers(ownerUserId)
  }

  if (accountType === 'venue') {
    return fetchOwnedVenues(ownerUserId)
  }

  return []
}

export default CreatorOnboardingSection
