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
import { setupSwagger } from '../src/common/swagger/swagger.config';

const server: Express = express();
let isInitialized = false;

// Root & Health direct routes on express
server.get('/', (req, res) => {
  res.json({
    name: 'OmniCast Broadcast API',
    version: '1.0.0',
    status: 'ONLINE',
    swagger: '/swagger',
    api: '/api/v1',
    time: new Date().toISOString(),
  });
});

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

  // Setup Swagger UI with custom dark glassmorphism styling
  setupSwagger(app);

  await app.init();
  isInitialized = true;
}

export default async function handler(req: Request, res: Response) {
  try {
    if (!isInitialized) {
      await bootstrap();
    }
    server(req, res);
  } catch (error: any) {
    console.error('Serverless Handler Error:', error);
    res.status(500).json({
      statusCode: 500,
      message: 'Internal Server Error during serverless execution',
      error: error?.message || String(error),
    });
  }
}
