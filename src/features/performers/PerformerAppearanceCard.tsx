import type { ReactNode } from 'react'
import {
  formatAppearanceDate,
  formatAppearanceLocation,
  formatAppearanceTime,
  getSafeTicketUrl,
  type PerformerAppearance,
} from './performerAppearances'

type PerformerAppearanceCardProps = {
  actions?: ReactNode
  appearance: PerformerAppearance
}

function PerformerAppearanceCard({
  actions,
  appearance,
}: PerformerAppearanceCardProps) {
  const location = formatAppearanceLocation(appearance)
  const safeTicketUrl = getSafeTicketUrl(appearance.ticketUrl)
  const dateTime = [
    formatAppearanceDate(appearance.appearanceDate),
    appearance.appearanceTime
      ? formatAppearanceTime(appearance.appearanceTime)
      : '',
  ]
    .filter(Boolean)
    .join(' at ')

  return (
    <article className="appearance-card">
      <div className="appearance-copy">
        <div className="appearance-heading">
          <h4>{appearance.title || appearance.venueName}</h4>
          {appearance.title ? <p>{appearance.venueName}</p> : null}
        </div>

        {location ? <p>{location}</p> : null}
        <p>{dateTime}</p>
        {appearance.notes ? (
          <p className="appearance-notes">{appearance.notes}</p>
        ) : null}
      </div>

      {safeTicketUrl || actions ? (
        <div className="appearance-actions">
          {safeTicketUrl ? (
            <a
              className="auth-submit-button"
              href={safeTicketUrl}
              rel="noreferrer noopener"
              target="_blank"
            >
              Ticket Link
            </a>
          ) : null}

          {actions}
        </div>
      ) : null}
    </article>
  )
}

export default PerformerAppearanceCard
