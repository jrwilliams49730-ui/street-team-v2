import type { PerformerSocialLinks } from './performers'

type PerformerSocialLinksFieldsProps = {
  onSocialLinksChange: (socialLinks: PerformerSocialLinks) => void
  socialLinks: PerformerSocialLinks
}

function PerformerSocialLinksFields({
  onSocialLinksChange,
  socialLinks,
}: PerformerSocialLinksFieldsProps) {
  function updateSocialLink(
    fieldName: keyof PerformerSocialLinks,
    value: string,
  ) {
    onSocialLinksChange({
      ...socialLinks,
      [fieldName]: value,
    })
  }

  return (
    <fieldset className="performer-social-fields">
      <legend>Social links</legend>

      <div className="performer-social-grid">
        <label>
          <span>Instagram</span>
          <input
            type="text"
            value={socialLinks.instagram}
            placeholder="instagram.com/name"
            onChange={(event) =>
              updateSocialLink('instagram', event.target.value)
            }
          />
        </label>

        <label>
          <span>TikTok</span>
          <input
            type="text"
            value={socialLinks.tiktok}
            placeholder="tiktok.com/@name"
            onChange={(event) => updateSocialLink('tiktok', event.target.value)}
          />
        </label>

        <label>
          <span>Facebook</span>
          <input
            type="text"
            value={socialLinks.facebook}
            placeholder="facebook.com/name"
            onChange={(event) =>
              updateSocialLink('facebook', event.target.value)
            }
          />
        </label>

        <label>
          <span>YouTube</span>
          <input
            type="text"
            value={socialLinks.youtube}
            placeholder="youtube.com/@channel"
            onChange={(event) =>
              updateSocialLink('youtube', event.target.value)
            }
          />
        </label>

        <label>
          <span>Website</span>
          <input
            type="text"
            value={socialLinks.website}
            placeholder="your-site.com"
            onChange={(event) =>
              updateSocialLink('website', event.target.value)
            }
          />
        </label>
      </div>
    </fieldset>
  )
}

export default PerformerSocialLinksFields
