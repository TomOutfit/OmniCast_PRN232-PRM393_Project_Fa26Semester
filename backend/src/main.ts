import 'dotenv/config';

// Ensure Supabase connection uses port 6543 (transaction pooler) in serverless environments
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('pooler.supabase.com')) {
  let url = process.env.DATABASE_URL
    .replace(':5432/', ':6543/')
    .replace('?pgbouncer=true', '')
    .replace('&pgbouncer=true', '');
  process.env.DATABASE_URL = url + (url.includes('?') ? '&' : '?') + 'pgbouncer=true&connection_limit=1';
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggerService } from './common/utils/logger.service';

import { setupSwagger } from './common/swagger/swagger.config';

// Global BigInt JSON serialization support
if (typeof (BigInt.prototype as any).toJSON !== 'function') {
  (BigInt.prototype as any).toJSON = function () {
    const int = Number.parseInt(this.toString(), 10);
    return Number.isSafeInteger(int) ? int : this.toString();
  };
}

async function bootstrap() {
  const logger = new LoggerService();

  const app = await NestFactory.create(AppModule, {
    logger,
    bodyParser: false,
  });

  // Increase body size limit for rich content uploads
  const express = require('express');
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Rewrite any /api/* missing /v1 to /api/v1/* automatically
  app.use((req: any, res: any, next: any) => {
    if (req.url.startsWith('/api/') && !req.url.startsWith('/api/v1/')) {
      req.url = req.url.replace('/api/', '/api/v1/');
    }
    next();
  });

  // Security headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false, // Swagger UI needs to load external scripts
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const configService = app.get(ConfigService);

  // Global Prefix
  app.setGlobalPrefix('api');

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  // CORS - explicit allowlist for production
  const allowedOrigins = configService
    .get<string>('FRONTEND_URL', '*')
    .split(',')
    .map((s) => s.trim());

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS: Origin not allowed'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400, // 24h preflight cache
  });

  // Global Validation Pipe
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

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global Response Interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger Documentation Setup
  setupSwagger(app);

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  logger.log(`🚀 OmniCast API is running on port ${port}`, 'Bootstrap');
  logger.log(`📚 Swagger Docs: /swagger`, 'Bootstrap');
}

bootstrap();
