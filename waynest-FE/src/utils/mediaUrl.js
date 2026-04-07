import { API_BASE_URL } from "@/api/client";

/**
 * Resolve media URLs with a same-origin preference for `/uploads/*` in production,
 * to avoid browser CORP/CORB blocks like `ERR_BLOCKED_BY_RESPONSE.NotSameOrigin`.
 */
const isLoopbackHost = (host) => host === "localhost" || host === "127.0.0.1";
const IMAGE_FILE_RE = /\.(avif|gif|jpe?g|png|svg|webp)(\?.*)?$/i;

const getPreferredUploadsOrigin = () => {
  const apiOrigin = (() => {
    try {
      return new URL(API_BASE_URL).origin;
    } catch {
      return API_BASE_URL;
    }
  })();

  if (typeof window === "undefined" || !window.location?.origin) {
    return apiOrigin;
  }

  const pageOrigin = window.location.origin;
  const pageHost = window.location.hostname;

  if (import.meta.env.PROD && !isLoopbackHost(pageHost)) {
    return pageOrigin;
  }

  return apiOrigin;
};

export function resolveMediaUrl(url) {
  if (!url || typeof url !== "string") return url;
  const trimmed = url.trim();
  const preferredUploadsOrigin = getPreferredUploadsOrigin();

  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) {
    return trimmed;
  }

  const normalized = trimmed.replace(/\\/g, "/");

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
    // If backend returns only the filename, resolve it under /uploads.
    if (!normalized.startsWith("/") && IMAGE_FILE_RE.test(normalized)) {
      return `${preferredUploadsOrigin}/uploads/${normalized}`;
    }
    return normalized;
  }
  return normalized;
}
