import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { setDefaultResultOrder } from 'node:dns';

async function bootstrap() {
  try {
    setDefaultResultOrder('ipv4first');
  } catch {}

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.use(cookieParser());

  // Get CORS origins from environment
  const frontendUrl = configService.get<string>('FRONTEND_URL')?.trim();
  const corsOriginsEnv = configService.get<string>('CORS_ORIGINS');
  const corsOrigins = corsOriginsEnv
    ? corsOriginsEnv
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    : [];

  // Default origins
  const allowedOrigins = new Set<string>([
    'http://localhost:5173',
    'https://waynest-8lub.vercel.app',
  ]);

  // Add FRONTEND_URL if provided
  if (frontendUrl) {
    allowedOrigins.add(frontendUrl);
  }

  // Add CORS_ORIGINS if provided
  corsOrigins.forEach((origin) => allowedOrigins.add(origin));

  const finalOrigins = Array.from(allowedOrigins);

  app.enableCors({
    origin: finalOrigins,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port);
}
bootstrap();
