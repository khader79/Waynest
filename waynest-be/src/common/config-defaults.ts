/**
 * Single source for HTTP listen port and CORS/Socket.IO browser origins.
 * Aligns main.ts, media.service toAbsoluteUrl fallbacks, and chat.gateway.
 */
export const DEFAULT_HTTP_PORT = 3001;

/**
 * Browsers may send Origin matching any of these during dev or remote demos.
 * FRONTEND_URL (when set) is included first.
 */
export function getCorsOriginOption(): string | string[] {
  const list = [
    process.env.FRONTEND_URL?.trim(),
    'http://localhost:5173',
    'http://83.244.43.88:5173',
  ].filter((o): o is string => Boolean(o));
  const unique = [...new Set(list)];
  if (unique.length === 0) {
    return 'http://localhost:5173';
  }
  if (unique.length === 1) {
    return unique[0];
  }
  return unique;
}
