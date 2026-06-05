import { PlaceImage } from '../interfaces/image-provider.interface';

// ── Quality heuristics ────────────────────────────────────────────────────────

const LOW_QUALITY_PATTERNS = [
  /[_\-](thumb|thumbnail|small|tiny|icon|preview|xs|sm)\.(jpe?g|png|webp|gif)$/i,
  /\b(16x16|24x24|32x32|48x48|50x50|64x64|75x75|100x100|120x90)\b/,
  /_(s|t|sq)\.(jpe?g|png|webp|gif)$/i,
  /placeholder|no.?image|default.?image|noimage/i,
];

/**
 * Trusted domains that are always high-quality regardless of URL patterns.
 * Wikimedia uses /thumb/ in ALL their URLs — must never be filtered.
 */
const TRUSTED_DOMAINS = new Set([
  'upload.wikimedia.org',      // Wikipedia / Wikimedia Commons — always fine
  'commons.wikimedia.org',
  'lh3.googleusercontent.com', // Google Places CDN
  'lh4.googleusercontent.com',
  'lh5.googleusercontent.com',
  'lh6.googleusercontent.com',
  'images.unsplash.com',
  'fastly.4sqi.net',
  'images.pexels.com',
  'live.staticflickr.com',
  'farm1.staticflickr.com',
  'farm2.staticflickr.com',
  'farm3.staticflickr.com',
  'farm4.staticflickr.com',
  'farm5.staticflickr.com',
  'farm6.staticflickr.com',
  'farm7.staticflickr.com',
  'farm8.staticflickr.com',
  'farm9.staticflickr.com',
]);

const HIGH_QUALITY_DOMAINS = TRUSTED_DOMAINS;

function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function isLikelyLowQuality(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    // Trusted CDNs — never filter, even if URL contains "thumb"
    if (TRUSTED_DOMAINS.has(host)) return false;
  } catch { /* ignore */ }
  return LOW_QUALITY_PATTERNS.some(p => p.test(url));
}

function normalizeForDedup(url: string): string {
  try {
    const u = new URL(url);
    // Compare protocol + host + pathname (ignore query params which may vary by size)
    return `${u.protocol}//${u.host}${u.pathname}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

// ── Validator class ───────────────────────────────────────────────────────────

export class ImageValidatorUtil {
  /**
   * Run all quality checks + dedup + landscape sort.
   * Returns a clean, deduplicated, quality-filtered array.
   */
  static process(images: PlaceImage[], maxImages = 10): PlaceImage[] {
    return ImageValidatorUtil.limitCount(
      ImageValidatorUtil.sortByQuality(
        ImageValidatorUtil.deduplicate(
          ImageValidatorUtil.filterInvalid(images),
        ),
      ),
      maxImages,
    );
  }

  /** Remove completely invalid URLs and obvious low-quality images. */
  static filterInvalid(images: PlaceImage[]): PlaceImage[] {
    return images.filter(img => {
      if (!img.url || !isValidUrl(img.url)) return false;
      if (isLikelyLowQuality(img.url)) return false;
      return true;
    });
  }

  /** Remove duplicate images (same path, ignoring query params). */
  static deduplicate(images: PlaceImage[]): PlaceImage[] {
    const seen = new Set<string>();
    return images.filter(img => {
      const key = normalizeForDedup(img.url);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Sort images by quality:
   * 1. Known high-quality CDN domains
   * 2. Landscape orientation (width > height) when known
   * 3. Larger dimensions
   * 4. Specific place images over generic ones
   */
  static sortByQuality(images: PlaceImage[]): PlaceImage[] {
    return [...images].sort((a, b) => {
      const scoreA = ImageValidatorUtil.qualityScore(a);
      const scoreB = ImageValidatorUtil.qualityScore(b);
      return scoreB - scoreA;
    });
  }

  static qualityScore(img: PlaceImage): number {
    let score = 0;

    // +50 for known high-quality CDNs
    try {
      const host = new URL(img.url).hostname;
      if (HIGH_QUALITY_DOMAINS.has(host)) score += 50;
    } catch { /* ignore */ }

    // +30 for landscape orientation (travel UI looks better with landscape)
    if (img.width && img.height && img.width > img.height) score += 30;

    // +10 per 100px of width (up to 1200px → +120 max)
    if (img.width) score += Math.min(img.width / 100, 12) * 10;

    // -20 for generic images (Unsplash fallback)
    if (img.isGeneric) score -= 20;

    // +10 for specific source preferences
    if (img.source === 'google_places') score += 10;
    if (img.source === 'wikipedia') score += 5;

    return score;
  }

  static limitCount(images: PlaceImage[], max: number): PlaceImage[] {
    return images.slice(0, max);
  }
}
