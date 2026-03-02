import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: 'http://localhost:5173',
    methods: 'GET,POST,PUT,DELETE',
  });
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT');
  //@ts-ignore
  await app.listen(port);
}
bootstrap();
