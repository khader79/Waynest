import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist/app.module';
import express from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';
import { createServer, proxy } from 'aws-serverless-express';

const server = express();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  app.enableCors({
    origin: 'https://waynest-8lub.vercel.app',
    credentials: true,
  });

  await app.init();
}

bootstrap();

const awsServer = createServer(server);

module.exports = (req: any, res: any) => proxy(awsServer, req, res);
