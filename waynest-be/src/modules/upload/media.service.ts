import { BadRequestException, Injectable } from '@nestjs/common';
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
    const safeExtension = ALLOWED_EXTENSIONS.has(extension) ? extension : '.jpg';
    return `${Date.now()}-${randomUUID()}${safeExtension}`;
  }

  toRelativePath(fileName: string) {
    return `/uploads/${fileName}`;
  }

  toAbsoluteUrl(relativePath: string) {
    const pathPart = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
    const explicit = process.env.API_URL?.replace(/\/+$/, '');
    if (explicit) {
      return `${explicit}${pathPart}`;
    }
    const port = process.env.PORT || '3000';
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
}

export const mediaUtils = {
  allowedExtensions: ALLOWED_EXTENSIONS,
  allowedMimeTypes: ALLOWED_MIME_TYPES,
  uploadsDir: join(process.cwd(), 'uploads'),
};
