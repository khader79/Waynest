import { resolveMediaUrl } from "@/utils/mediaUrl";

const firstNonEmptyString = (...values) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
};

const firstNonEmptyArrayString = (value) => {
  if (!Array.isArray(value)) {
    return null;
  }

  const match = value.find((item) => typeof item === "string" && item.trim());
  return typeof match === "string" ? match.trim() : null;
};

export const pickPlaceImageField = (entity) => {
  if (!entity) {
    return null;
  }

  if (typeof entity === "string") {
    return entity.trim() || null;
  }

  if (typeof entity !== "object") {
    return null;
  }

  const placeObj =
    entity.place && typeof entity.place === "object" ? entity.place : null;
  const venueObj =
    entity.venue && typeof entity.venue === "object" ? entity.venue : null;
  const imageObj =
    entity.image && typeof entity.image === "object" ? entity.image : null;
  const coverObj =
    entity.cover && typeof entity.cover === "object" ? entity.cover : null;

  return firstNonEmptyString(
    entity.imageUrl,
    entity.image_url,
    entity.image,
    entity.coverPhotoUrl,
    entity.cover_photo_url,
    entity.coverUrl,
    entity.cover_url,
    entity.cover,
    entity.thumbnailUrl,
    entity.thumbnail_url,
    entity.thumbnail,
    entity.photoUrl,
    entity.photo_url,
    entity.photo,
    entity.picture,
    entity.pictureUrl,
    entity.picture_url,
    firstNonEmptyArrayString(entity.photos),
    firstNonEmptyArrayString(entity.images),
    imageObj?.url,
    imageObj?.src,
    imageObj?.path,
    coverObj?.url,
    coverObj?.src,
    coverObj?.path,
    placeObj?.imageUrl,
    placeObj?.image,
    placeObj?.coverPhotoUrl,
    placeObj?.coverUrl,
    placeObj?.thumbnailUrl,
    placeObj?.photoUrl,
    venueObj?.imageUrl,
    venueObj?.image,
    venueObj?.coverPhotoUrl,
    venueObj?.coverUrl,
    venueObj?.thumbnailUrl,
    venueObj?.photoUrl,
  );
};

export const getResolvedPlaceImageUrl = (entity) => {
  const raw = pickPlaceImageField(entity);
  return raw ? resolveMediaUrl(raw) : null;
};
