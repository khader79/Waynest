import 'module-alias/register';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import express from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { mkdirSync } from 'fs';
import { getCorsOriginOption } from '../src/common/config-defaults';
import { getUploadsDir } from '../src/modules/upload/uploads-path';
import {
  applyUploadResponseHeaders,
  MISSING_UPLOAD_SVG,
} from '../src/modules/upload/missing-upload-response';

let cachedServer: express.Express | null = null;

function readNonNegativeIntEnv(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

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
  const compressionThreshold = readNonNegativeIntEnv(
    'HTTP_COMPRESSION_THRESHOLD',
    2048,
  );
  server.disable('x-powered-by');
  server.set('etag', false);
  server.use(
    compression({
      threshold: compressionThreshold,
      filter: (req, res) => {
        const p = req.originalUrl?.split('?')[0] ?? '';
        if (p.startsWith('/uploads')) {
          return false;
        }
        return compression.filter(req, res);
      },
    }),
  );
  const uploadDir = getUploadsDir();
  try {
    mkdirSync(uploadDir, { recursive: true });
  } catch (error) {
    Logger.warn(
      `Failed to create uploads dir at ${uploadDir}: ${String(error)}`,
    );
  }

  // Accept both /auth/* and /api/auth/* in serverless deployments.
  server.use('/api', (_req, _res, next) => next());

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

  const expressApp = app.getHttpAdapter().getInstance();
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
    maxAge: 600,
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

  // Swagger for serverless entry (enable with ENABLE_SWAGGER=true in production)
  const enableSwagger =
    process.env.NODE_ENV !== 'production' ||
    process.env.ENABLE_SWAGGER === 'true';

  if (enableSwagger) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Waynest API')
      .setDescription('REST API documentation for the Waynest travel platform')
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        'access-token',
      )
      .addApiKey(
        { type: 'apiKey', in: 'header', name: 'x-device-fingerprint' },
        'device-fingerprint',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
    Logger.log(`Swagger UI enabled at /docs and /api/docs (serverless)`);
  } else {
    Logger.log(
      `Swagger UI disabled for serverless (NODE_ENV=${process.env.NODE_ENV}). Set ENABLE_SWAGGER=true to enable.`,
    );
  }

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
