type ProfileImageAvatarProps = {
  className: string
  imageUrl: string | null
  initials: string
  name: string
}

function ProfileImageAvatar({
  className,
  imageUrl,
  initials,
  name,
}: ProfileImageAvatarProps) {
  return (
    <div className={`image-avatar ${imageUrl ? 'has-image' : ''} ${className}`}>
      {imageUrl ? <img src={imageUrl} alt={`${name} profile`} /> : initials}
    </div>
  )
}

export default ProfileImageAvatar
