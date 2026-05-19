import { supabase } from '../../lib/supabase'

export type ProfileImageType = 'performer' | 'producer' | 'venue'

const profileImagesBucket = 'profile-images'

type UploadProfileImageInput = {
  file: File
  ownerUserId: string
  profileId: string
  profileType: ProfileImageType
}

export async function uploadProfileImage(input: UploadProfileImageInput) {
  if (!input.file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.')
  }

  const filePath = createProfileImagePath(input)
  const { error } = await supabase.storage
    .from(profileImagesBucket)
    .upload(filePath, input.file, {
      contentType: input.file.type,
      upsert: false,
    })

  if (error) {
    throw error
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(profileImagesBucket).getPublicUrl(filePath)

  return publicUrl
}

function createProfileImagePath({
  file,
  ownerUserId,
  profileId,
  profileType,
}: UploadProfileImageInput) {
  const extension = getImageExtension(file)
  const timestamp = Date.now()

  return `${ownerUserId}/${profileType}-${profileId}-${timestamp}.${extension}`
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
