import { get } from "@/api/request";

/**
 * Fetch a full image gallery for a named place.
 * @param {string}  name       Place name
 * @param {string}  [city]     City context (improves accuracy)
 * @param {string}  [type]     Place type (e.g. RESTAURANT, MUSEUM)
 * @param {number}  [maxImages=5]
 * @param {number}  [lat]      Latitude — enables nearbysearch (much more accurate)
 * @param {number}  [lng]      Longitude
 */
export const fetchPlaceGallery = (name, city, type, maxImages = 5, lat, lng) => {
  const params = new URLSearchParams({ name, maxImages: String(maxImages) });
  if (city)                          params.set("city", city);
  if (type)                          params.set("type", type);
  if (lat != null && lng != null) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
  }
  return get(`/place-images?${params}`);
};

/**
 * Fetch a single best image URL for a place.
 * Returns null if nothing found.
 */
export const fetchPrimaryImage = async (name, city, type) => {
  try {
    const gallery = await fetchPlaceGallery(name, city, type, 1);
    return gallery?.images?.[0]?.url ?? null;
  } catch {
    return null;
  }
};
