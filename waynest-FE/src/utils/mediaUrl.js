import { API_BASE_URL } from "@/api/client";

/**
 * Uploaded files are served from the API origin. The backend may return
 * `http://localhost:3001/uploads/...` with a different API host in the client — fix display URLs.
 */
export function resolveMediaUrl(url) {
  if (!url || typeof url !== "string") return url;
  const trimmed = url.trim();
  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) {
    return trimmed;
  }
  if (trimmed.startsWith("/uploads/")) {
    return `${API_BASE_URL}${trimmed}`;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname.startsWith("/uploads/")) {
      const origin = new URL(API_BASE_URL).origin;
      return `${origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    return trimmed;
  }
  return trimmed;
}
