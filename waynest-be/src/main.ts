import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { setDefaultResultOrder } from 'node:dns';

async function bootstrap() {
  // Prefer IPv4 to avoid IPv6-only SMTP connection failures on some networks
  try {
    setDefaultResultOrder('ipv4first');
  } catch {
    // Ignore if not supported by the Node version
  }

  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept',
  });
  app.enableCors({
    origin: 'https://waynest-8lub.vercel.app/',
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept',
  });
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT');
  //@ts-ignore
  await app.listen(port);
}
bootstrap();
