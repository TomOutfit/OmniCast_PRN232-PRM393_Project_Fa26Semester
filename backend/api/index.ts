// ============================================================
// OmniCast - Vercel Serverless Entrypoint
// ============================================================

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express, Request, Response } from 'express';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

const server: Express = express();
let isInitialized = false;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));

  // Global Prefix
  app.setGlobalPrefix('api');

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  // CORS
  app.enableCors({
    origin: '*',
    credentials: true,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Filters & Interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('OmniCast API')
    .setDescription(
      'Enterprise Media & Broadcast Intelligence Network API Documentation',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication & Authorization')
    .addTag('channels', 'Broadcast Channels Management')
    .addTag('programs', 'Broadcast Programs & EPG Management')
    .addTag('search', 'Search & Filter Engine')
    .addTag('ai-curator', 'AI Content Curator')
    .addTag('audit-logger', 'Audit Logging')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('swagger', app, document);

  await app.init();
  isInitialized = true;
}

export default async function handler(req: Request, res: Response) {
  if (!isInitialized) {
    await bootstrap();
  }
  server(req, res);
}
