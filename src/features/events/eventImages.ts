import { supabase } from '../../lib/supabase'

const eventImagesBucket = 'event-images'

type UploadEventImageInput = {
  eventId: string
  file: File
  ownerUserId: string
}

export async function uploadEventImage({
  eventId,
  file,
  ownerUserId,
}: UploadEventImageInput) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.')
  }

  const extension = getImageExtension(file)
  const filePath = `${ownerUserId}/event-${eventId}-${Date.now()}.${extension}`
  const { error } = await supabase.storage
    .from(eventImagesBucket)
    .upload(filePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    throw error
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(eventImagesBucket).getPublicUrl(filePath)

  return publicUrl
}

function getImageExtension(file: File) {
  const extensionFromName = file.name
    .split('.')
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, '')

  if (extensionFromName) {
    return extensionFromName === 'jpeg' ? 'jpg' : extensionFromName
  }

  const extensionFromType = file.type.split('/').pop()?.toLowerCase()

  if (extensionFromType) {
    return extensionFromType === 'jpeg' ? 'jpg' : extensionFromType
  }

  return 'jpg'
}
