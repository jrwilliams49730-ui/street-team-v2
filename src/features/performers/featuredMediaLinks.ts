import type { FeaturedMediaType } from './performers'

const youtubeVideoIdPattern = /^[a-zA-Z0-9_-]{11}$/

export function canRenderFeaturedMedia(
  mediaUrl: string | null,
  mediaType: FeaturedMediaType | null,
) {
  if (!mediaUrl || !mediaType) {
    return false
  }

  return mediaType === 'video'
    ? isYouTubeUrl(mediaUrl)
    : isSoundCloudUrl(mediaUrl)
}

export function getYouTubeEmbedUrl(value: string) {
  const videoId = getYouTubeVideoId(value)

  return videoId ? `https://www.youtube.com/embed/${videoId}` : null
}

export function getSoundCloudEmbedUrl(value: string) {
  if (!isSoundCloudUrl(value)) {
    return null
  }

  const encodedUrl = encodeURIComponent(value.trim())

  return `https://w.soundcloud.com/player/?url=${encodedUrl}&color=%23ef2722&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false`
}

export function isYouTubeUrl(value: string) {
  return Boolean(getYouTubeVideoId(value))
}

export function isSoundCloudUrl(value: string) {
  let url: URL

  try {
    url = new URL(value.trim())
  } catch {
    return false
  }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, '')

  if (hostname === 'soundcloud.com' || hostname === 'm.soundcloud.com') {
    return url.pathname.split('/').filter(Boolean).length >= 2
  }

  return hostname === 'on.soundcloud.com'
}

function getYouTubeVideoId(value: string) {
  let url: URL

  try {
    url = new URL(value.trim())
  } catch {
    return null
  }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, '')

  if (hostname === 'youtu.be') {
    return normalizeVideoId(url.pathname.split('/').filter(Boolean)[0])
  }

  if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
    return normalizeVideoId(url.searchParams.get('v'))
  }

  return null
}

function normalizeVideoId(value: string | null | undefined) {
  const videoId = value?.trim() ?? ''

  return youtubeVideoIdPattern.test(videoId) ? videoId : null
}
