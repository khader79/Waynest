import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { setDefaultResultOrder } from 'node:dns';

async function bootstrap() {
  try {
    setDefaultResultOrder('ipv4first');
  } catch {
    // ignore
  }

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.use(cookieParser());

   const frontendUrl = configService.get<string>('FRONTEND_URL')?.trim();
  const corsOriginsEnv = configService.get<string>('CORS_ORIGINS');
  const corsOrigins = corsOriginsEnv
    ? corsOriginsEnv
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    : [];

  const allowedOrigins = new Set<string>([
    'http://localhost:5173',
    'https://waynest-8lub.vercel.app',
    'http://188.161.20.94:9070',
    'http://188.161.20.94:9071',
  ]);

  if (frontendUrl) {
    allowedOrigins.add(frontendUrl);
  }

  corsOrigins.forEach((origin) => allowedOrigins.add(origin));

  const finalOrigins = Array.from(allowedOrigins);

  app.enableCors({
    origin: finalOrigins,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: ['Content-Type', 'Authorization', 'x-device-fingerprint'],
  });

  const portRaw = configService.get<string>('PORT');
  const port = Number(portRaw ?? 3000);
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
