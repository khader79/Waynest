import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './common/adapters/redis-io.adapter';
import {
  DEFAULT_HTTP_PORT,
  getCorsOriginOption,
} from './common/config-defaults';
import { slowRequestMiddleware } from './common/middleware/slow-request.middleware';
import { getUploadsDir } from './modules/upload/uploads-path';
import {
  applyUploadResponseHeaders,
  MISSING_UPLOAD_SVG,
} from './modules/upload/missing-upload-response';

function readNonNegativeIntEnv(name: string, fallback: number): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(getUploadsDir(), {
    prefix: '/uploads',
    setHeaders: (res) => {
      applyUploadResponseHeaders(res);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  });

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    const redisIoAdapter = new RedisIoAdapter(app, redisUrl);
    await redisIoAdapter.connectToRedis();
    app.useWebSocketAdapter(redisIoAdapter);
    Logger.log(`WebSocket adapter: Redis enabled (REDIS_URL=${redisUrl})`);
  } else {
    app.useWebSocketAdapter(new IoAdapter(app));
    Logger.log('WebSocket adapter: Redis disabled, using default IoAdapter');
  }

  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production',
    }),
  );
  app.use(cookieParser());

  // Avoid 304 + cached JSON for API clients (stale bodies missing new fields like likeCount).
  const expressApp = app.getHttpAdapter().getInstance();
  const compressionThreshold = readNonNegativeIntEnv(
    'HTTP_COMPRESSION_THRESHOLD',
    2048,
  );
  expressApp.disable('x-powered-by');
  expressApp.set('etag', false);
  expressApp.get(/^\/uploads\/.+$/, (_req, res) => {
    applyUploadResponseHeaders(res);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.type('image/svg+xml').status(200).send(MISSING_UPLOAD_SVG);
  });
  expressApp.use(
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
  expressApp.use((req, res, next) => {
    const p = req.originalUrl?.split('?')[0] ?? '';
    if (!p.startsWith('/uploads')) {
      res.setHeader('Cache-Control', 'no-store, private, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
    }
    next();
  });

  // Register slow-request middleware to log slow endpoints (best-effort)
  try {
    app.use(slowRequestMiddleware);
  } catch (err) {
    Logger.warn('Failed to attach slowRequestMiddleware', String(err));
  }

  app.enableCors({
    origin: getCorsOriginOption(),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
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

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Swagger ──────────────────────────────────────────────
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
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });
    Logger.log(
      `Swagger UI enabled at /api/docs (NODE_ENV=${process.env.NODE_ENV})`,
    );
  } else {
    Logger.log(
      `Swagger UI disabled (NODE_ENV=${process.env.NODE_ENV}). Set ENABLE_SWAGGER=true to enable.`,
    );
  }
  // ─────────────────────────────────────────────────────────

  const port = Number(process.env.PORT) || DEFAULT_HTTP_PORT;
  const keepAliveTimeoutMs = readNonNegativeIntEnv(
    'HTTP_KEEP_ALIVE_TIMEOUT_MS',
    65_000,
  );
  const configuredHeadersTimeoutMs = readNonNegativeIntEnv(
    'HTTP_HEADERS_TIMEOUT_MS',
    66_000,
  );
  const headersTimeoutMs = Math.max(
    configuredHeadersTimeoutMs,
    keepAliveTimeoutMs + 1_000,
  );
  const requestTimeoutMs = readNonNegativeIntEnv(
    'HTTP_REQUEST_TIMEOUT_MS',
    30_000,
  );

  const server = await app.listen(port);
  server.keepAliveTimeout = keepAliveTimeoutMs;
  server.headersTimeout = headersTimeoutMs;
  server.requestTimeout = requestTimeoutMs;
}

void bootstrap();
