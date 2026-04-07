import { API_BASE_URL } from "@/api/client";

/**
 * Resolve media URLs against the API origin.
 * `API_BASE_URL` already rewrites bad loopback prod values to the page host when needed,
 * so uploads should follow the API host rather than assuming the frontend also serves `/uploads`.
 */
const IMAGE_FILE_RE = /\.(avif|gif|jpe?g|png|svg|webp)(\?.*)?$/i;
const FAILED_MEDIA_STORAGE_KEY = "waynest-failed-media-urls";

const loadFailedMediaUrls = () => {
  try {
    const raw = window.localStorage.getItem(FAILED_MEDIA_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((value) => typeof value === "string" && value.trim())
      : [];
  } catch {
    return [];
  }
};

const persistFailedMediaUrls = (values) => {
  try {
    window.localStorage.setItem(
      FAILED_MEDIA_STORAGE_KEY,
      JSON.stringify([...values]),
    );
  } catch {
    /* ignore storage failures */
  }
};

const failedMediaUrls = new Set(
  typeof window === "undefined" ? [] : loadFailedMediaUrls(),
);

const getPreferredUploadsOrigin = () => {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return API_BASE_URL;
  }
};

export function resolveMediaUrl(url) {
  if (!url || typeof url !== "string") return url;
  const trimmed = url.trim();
  const preferredUploadsOrigin = getPreferredUploadsOrigin();

  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) {
    return trimmed;
  }

  const normalized = trimmed.replace(/\\/g, "/");

  if (normalized.startsWith("/uploads/")) {
    return `${preferredUploadsOrigin}${normalized}`;
  }
  if (trimmed.startsWith("/uploads/")) {
    return `${preferredUploadsOrigin}${trimmed}`;
  }
  if (normalized.startsWith("uploads/")) {
    return `${preferredUploadsOrigin}/${normalized}`;
  }
  if (normalized.startsWith("./uploads/")) {
    return `${preferredUploadsOrigin}/${normalized.slice(2)}`;
  }

  try {
    const parsed = new URL(normalized);
    if (parsed.pathname.startsWith("/uploads/")) {
      return `${preferredUploadsOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    if (!normalized.startsWith("/") && IMAGE_FILE_RE.test(normalized)) {
      return `${preferredUploadsOrigin}/uploads/${normalized}`;
    }
    return normalized;
  }
  return normalized;
}

export function markMediaUrlFailed(url) {
  const resolved = resolveMediaUrl(url);
  if (typeof resolved === "string" && resolved.trim()) {
    failedMediaUrls.add(resolved.trim());
    persistFailedMediaUrls(failedMediaUrls);
  }
}

export function hasMediaUrlFailed(url) {
  const resolved = resolveMediaUrl(url);
  return typeof resolved === "string" && failedMediaUrls.has(resolved.trim());
}
