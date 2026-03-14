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

  app.use(cookieParser());

  app.enableCors({
    origin: ['http://localhost:5173', 'https://waynest-8lub.vercel.app'],
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
