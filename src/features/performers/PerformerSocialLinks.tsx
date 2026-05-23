import type { PerformerSocialLinks as PerformerSocialLinkValues } from './performers'

type PerformerSocialLinksProps = {
  socialLinks: PerformerSocialLinkValues
}

function PerformerSocialLinks({ socialLinks }: PerformerSocialLinksProps) {
  const links = [
    { label: 'Instagram', url: socialLinks.instagram },
    { label: 'TikTok', url: socialLinks.tiktok },
    { label: 'Facebook', url: socialLinks.facebook },
    { label: 'YouTube', url: socialLinks.youtube },
    { label: 'Website', url: socialLinks.website },
  ].filter((link) => Boolean(link.url))

  if (links.length === 0) {
    return null
  }

  return (
    <div className="profile-social-links" aria-label="Performer links">
      {links.map((link) => (
        <a
          key={link.label}
          className="profile-social-link"
          href={link.url}
          rel="noreferrer"
          target="_blank"
        >
          {link.label}
        </a>
      ))}
    </div>
  )
}

export default PerformerSocialLinks
