import { API_BASE_URL } from "@/api/client";

/**
 * Resolve media URLs with a same-origin preference for `/uploads/*` in production,
 * to avoid browser CORP/CORB blocks like `ERR_BLOCKED_BY_RESPONSE.NotSameOrigin`.
 */
const isLoopbackHost = (host) => host === "localhost" || host === "127.0.0.1";

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
  if (trimmed.startsWith("/uploads/")) {
    return `${preferredUploadsOrigin}${trimmed}`;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname.startsWith("/uploads/")) {
      return `${preferredUploadsOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return trimmed;
  }
  return trimmed;
}
