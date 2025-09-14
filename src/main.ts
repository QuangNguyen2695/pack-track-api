import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SizeLimitMiddleware } from './middleware/size-limit-middleware';
import * as bodyParser from 'body-parser';
import fastifyMultipart from '@fastify/multipart';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  (app as any).register(fastifyMultipart);

  app.useGlobalPipes(new ValidationPipe());
  const configService = app.get(ConfigService);
  const port = configService.get('PORT');
  // app.use(bodyParser.json({ limit: '500mb' }));
  // app.use(bodyParser.urlencoded({ limit: '500mb', extended: true }));

  app.enableCors({
    origin: ['*'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  });
  // Apply Custom Middleware for Request Size
  app.use(new SizeLimitMiddleware().use);

  await app.listen(port, '0.0.0.0');
}
bootstrap();
