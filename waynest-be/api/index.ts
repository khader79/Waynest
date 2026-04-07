import 'module-alias/register';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import express from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { mkdirSync } from 'fs';
import { getCorsOriginOption } from '../src/common/config-defaults';
import { getUploadsDir } from '../src/modules/upload/uploads-path';
import {
  applyUploadResponseHeaders,
  MISSING_UPLOAD_SVG,
} from '../src/modules/upload/missing-upload-response';

let cachedServer: express.Express | null = null;

/** Same browser origins as main.ts, plus optional extra comma-separated `CORS_ORIGINS`. */
function parseCorsOrigins(): string | string[] {
  const extra = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const base = getCorsOriginOption();
  const baseList = Array.isArray(base) ? base : [base];
  const merged = [...new Set([...extra, ...baseList])];
  return merged.length === 1 ? merged[0] : merged;
}

async function bootstrapServer(): Promise<express.Express> {
  if (cachedServer) {
    return cachedServer;
  }

  const server = express();
  const uploadDir = getUploadsDir();
  mkdirSync(uploadDir, { recursive: true });
  server.use(
    '/uploads',
    express.static(uploadDir, {
      setHeaders: (res) => {
        applyUploadResponseHeaders(res);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      },
    }),
  );
  server.get(/^\/uploads\/.+$/, (_req, res) => {
    applyUploadResponseHeaders(res);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.type('image/svg+xml').status(200).send(MISSING_UPLOAD_SVG);
  });
  server.get('/', (_req, res) => {
    res.status(200).send('OK');
  });
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  app.use(cookieParser());
  app.setGlobalPrefix('api');

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('etag', false);
  expressApp.use((req, res, next) => {
    const p = req.originalUrl?.split('?')[0] ?? '';
    if (!p.startsWith('/uploads')) {
      res.setHeader('Cache-Control', 'no-store, private, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
    }
    next();
  });

  app.enableCors({
    origin: parseCorsOrigins(),
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'Cache-Control',
      'Pragma',
      'x-device-fingerprint',
      'x-trip-guest-token',
    ],
  });

  await app.init();

  cachedServer = server;
  return cachedServer;
}

const handler = async (req: any, res: any) => {
  const server = await bootstrapServer();
  return server(req, res);
};

export default handler;
module.exports = handler;
