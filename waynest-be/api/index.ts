import 'tsconfig-paths/register';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import express from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';

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
  server.get('/', (_req, res) => {
    res.status(200).send('OK');
  });
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  app.use(cookieParser());
  app.setGlobalPrefix('api');

  const origins = parseCorsOrigins();
  app.enableCors({
    origin: origins.length > 0 ? origins : true,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization',
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
