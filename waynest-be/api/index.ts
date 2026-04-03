import 'module-alias/register';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import express from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import { mkdirSync } from 'fs';

let cachedServer: express.Express | null = null;

function parseCorsOrigins(): string[] {
  const envOrigins = process.env.CORS_ORIGINS ?? '';
  const fromEnv = envOrigins
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const frontendUrl = process.env.FRONTEND_URL?.trim();

  const merged = new Set<string>(fromEnv);
  if (frontendUrl) {
    merged.add(frontendUrl);
  }

  return Array.from(merged);
}

async function bootstrapServer(): Promise<express.Express> {
  if (cachedServer) {
    return cachedServer;
  }

  const server = express();
  const uploadDir = join(process.cwd(), 'uploads');
  mkdirSync(uploadDir, { recursive: true });
  server.use('/uploads', express.static(uploadDir));
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

  const origins = parseCorsOrigins();
  app.enableCors({
    origin: origins.length > 0 ? origins : true,
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
