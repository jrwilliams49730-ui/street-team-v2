import type { FeaturedMediaType } from './performers'
import {
  getSoundCloudEmbedUrl,
  getYouTubeEmbedUrl,
} from './featuredMediaLinks'

type FeaturedMediaPlayerProps = {
  className?: string
  mediaType: FeaturedMediaType
  mediaUrl: string
}

function FeaturedMediaPlayer({
  className = '',
  mediaType,
  mediaUrl,
}: FeaturedMediaPlayerProps) {
  const classNames = ['featured-media-player', className]
    .filter(Boolean)
    .join(' ')

  if (mediaType === 'video') {
    const youtubeEmbedUrl = getYouTubeEmbedUrl(mediaUrl)

    if (youtubeEmbedUrl) {
      return (
        <div className={`${classNames} youtube-featured-media`}>
          <iframe
            src={youtubeEmbedUrl}
            title="Featured YouTube media"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      )
    }

    return null
  }

  const soundCloudEmbedUrl = getSoundCloudEmbedUrl(mediaUrl)

  if (soundCloudEmbedUrl) {
    return (
      <div className={`${classNames} soundcloud-featured-media`}>
        <iframe
          src={soundCloudEmbedUrl}
          title="Featured SoundCloud media"
          allow="autoplay"
        />
      </div>
    )
  }

  return null
}

export default FeaturedMediaPlayer
