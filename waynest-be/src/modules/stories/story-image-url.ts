import { BadRequestException } from '@nestjs/common';

/** Shared check for uploaded image URLs (localhost + production). */
const HTTP_S_IMAGE_URL = /^https?:\/\/\S+$/i;

export function assertStoryImageUrl(raw: string, field = 'imageUrl'): string {
  const value = raw.trim();
  if (!HTTP_S_IMAGE_URL.test(value)) {
    throw new BadRequestException(
      `${field} must be a valid http(s) URL (e.g. from POST /upload/image)`,
    );
  }
  return value;
}
