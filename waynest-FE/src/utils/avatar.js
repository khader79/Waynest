import {
  hasMediaUrlFailed,
  markMediaUrlFailed,
  resolveMediaUrl,
} from "@/utils/mediaUrl";

export const DEFAULT_AVATAR_SRC = "/images/default-avatar.svg";

export const pickAvatarField = (entity) => {
  if (!entity || typeof entity !== "object") {
    return null;
  }

  const avatarObj =
    entity.avatar && typeof entity.avatar === "object" ? entity.avatar : null;
  const profileImageObj =
    entity.profileImage && typeof entity.profileImage === "object"
      ? entity.profileImage
      : null;
  const userObj =
    entity.user && typeof entity.user === "object" ? entity.user : null;

  const candidates = [
    entity.avatarUrl,
    entity.avatar_url,
    entity.avatar,
    entity.avatarPath,
    entity.avatar_path,
    entity.avatarImage,
    entity.avatar_image,
    entity.profileImage,
    entity.profile_image,
    entity.profilePicture,
    entity.profile_picture,
    entity.profilePhoto,
    entity.profile_photo,
    entity.imageUrl,
    entity.image_url,
    entity.image,
    entity.picture,
    entity.photoUrl,
    entity.photo,
    avatarObj?.url,
    avatarObj?.path,
    avatarObj?.src,
    profileImageObj?.url,
    profileImageObj?.path,
    profileImageObj?.src,
    userObj?.avatarUrl,
    userObj?.avatar_url,
    userObj?.avatar,
    userObj?.profileImage,
    userObj?.profile_image,
  ];

  const raw = candidates.find(
    (value) => typeof value === "string" && value.trim(),
  );
  return raw ? raw.trim() : null;
};

export const getResolvedAvatarUrl = (entity) => {
  const raw = pickAvatarField(entity);
  if (!raw || hasMediaUrlFailed(raw)) {
    return null;
  }
  return resolveMediaUrl(raw);
};

export const handleAvatarImageError = (event) => {
  const failedSrc =
    event?.currentTarget?.currentSrc || event?.currentTarget?.src || "";
  markMediaUrlFailed(failedSrc);
  if (event?.currentTarget) {
    event.currentTarget.onerror = null;
    event.currentTarget.src = DEFAULT_AVATAR_SRC;
  }
};
