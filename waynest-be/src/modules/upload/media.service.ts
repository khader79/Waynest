import { BadRequestException, Injectable } from '@nestjs/common';
import { DEFAULT_HTTP_PORT } from 'src/common/config-defaults';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { extname, join } from 'path';
import { randomUUID } from 'crypto';

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

@Injectable()
export class MediaService {
  private readonly uploadsDir = join(process.cwd(), 'uploads');

  ensureUploadsDir() {
    mkdirSync(this.uploadsDir, { recursive: true });
  }

  getUploadsDir() {
    this.ensureUploadsDir();
    return this.uploadsDir;
  }

  validateImage(file: { originalname: string; mimetype: string }) {
    const extension = extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      throw new BadRequestException('Unsupported image extension');
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Unsupported image type');
    }
  }

  generateImageFileName(originalName: string) {
    const extension = extname(originalName).toLowerCase();
    const safeExtension = ALLOWED_EXTENSIONS.has(extension)
      ? extension
      : '.jpg';
    return `${Date.now()}-${randomUUID()}${safeExtension}`;
  }

  toRelativePath(fileName: string) {
    return `/uploads/${fileName}`;
  }

  toAbsoluteUrl(relativePath: string) {
    const pathPart = relativePath.startsWith('/')
      ? relativePath
      : `/${relativePath}`;
    const explicit = process.env.API_URL?.replace(/\/+$/, '');
    if (explicit) {
      return `${explicit}${pathPart}`;
    }
    const port = process.env.PORT || String(DEFAULT_HTTP_PORT);
    const host = process.env.API_HOST || 'localhost';
    const baseUrl = `http://${host}:${port}`;
    return `${baseUrl}${pathPart}`;
  }

  resolvePathFromUrl(urlOrPath: string) {
    if (!urlOrPath) {
      return null;
    }
    const parsed = urlOrPath.trim();
    const relativePath = parsed.startsWith('http')
      ? this.extractRelativeUploadsPath(parsed)
      : parsed;
    if (!relativePath || !relativePath.startsWith('/uploads/')) {
      return null;
    }
    const fileName = relativePath.replace('/uploads/', '');
    if (!fileName) {
      return null;
    }
    return join(this.uploadsDir, fileName);
  }

  deleteByUrl(urlOrPath: string) {
    const absolutePath = this.resolvePathFromUrl(urlOrPath);
    if (!absolutePath || !existsSync(absolutePath)) {
      return false;
    }
    unlinkSync(absolutePath);
    return true;
  }

  private extractRelativeUploadsPath(url: string) {
    try {
      const parsed = new URL(url);
      return parsed.pathname;
    } catch {
      return null;
    }
  }

  /**
   * Canonical storage form for uploaded images: `/uploads/<file>`.
   * Accepts the same path or any http(s) URL whose pathname is under `/uploads/`.
   */
  toRelativeUploadPath(urlOrPath: string | null | undefined): string | null {
    if (!urlOrPath || typeof urlOrPath !== 'string') {
      return null;
    }
    const t = urlOrPath.trim();
    if (!t) {
      return null;
    }
    if (t.startsWith('/uploads/')) {
      return t;
    }
    if (t.startsWith('http')) {
      const pathname = this.extractRelativeUploadsPath(t);
      if (pathname?.startsWith('/uploads/')) {
        return pathname;
      }
    }
    return null;
  }

  /**
   * JSON responses: prefer host-agnostic `/uploads/...`.
   * If the value is not under our uploads path, returns the original string (e.g. external avatar URL).
   */
  publicUploadRef(raw: string | null | undefined): string | null {
    if (raw == null || typeof raw !== 'string') {
      return null;
    }
    const t = raw.trim();
    if (!t) {
      return null;
    }
    return this.toRelativeUploadPath(t) ?? t;
  }

  /** Persist only relative `/uploads/...` paths so URLs are not tied to one host/port. */
  normalizeUploadImageRef(raw: string): string {
    const rel = this.toRelativeUploadPath(raw);
    if (!rel) {
      throw new BadRequestException(
        'Image must be an app upload under /uploads/',
      );
    }
    return rel;
  }

  /** Match legacy DB rows that still store full absolute URLs for the same file. */
  uploadRefVariantsForQuery(urlOrPath: string): string[] {
    const t = urlOrPath.trim();
    const rel = this.toRelativeUploadPath(t);
    if (!rel) {
      return t ? [t] : [];
    }
    const set = new Set<string>([rel]);
    if (t !== rel) {
      set.add(t);
    }
    return [...set];
  }
}

export const mediaUtils = {
  allowedExtensions: ALLOWED_EXTENSIONS,
  allowedMimeTypes: ALLOWED_MIME_TYPES,
  uploadsDir: join(process.cwd(), 'uploads'),
};
