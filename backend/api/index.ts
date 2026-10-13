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
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express, Request, Response } from 'express';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';
import { setupSwagger } from '../src/common/swagger/swagger.config';

import * as path from 'path';
import * as fs from 'fs';

// Global BigInt JSON serialization support
if (typeof (BigInt.prototype as any).toJSON !== 'function') {
  (BigInt.prototype as any).toJSON = function () {
    const int = Number.parseInt(this.toString(), 10);
    return Number.isSafeInteger(int) ? int : this.toString();
  };
}

const server: Express = express();
let isInitialized = false;

// Serve self-recorded uploads in serverless / local
const isServerless =
  Boolean(process.env.VERCEL) ||
  Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
  Boolean(process.env.LAMBDA_TASK_ROOT) ||
  (typeof process.cwd === 'function' && process.cwd().startsWith('/var/task'));

const uploadRoot = path.resolve(
  process.env.UPLOAD_ROOT && !process.env.UPLOAD_ROOT.startsWith('/var/task')
    ? process.env.UPLOAD_ROOT
    : isServerless
    ? path.join('/tmp', 'uploads')
    : path.join(process.cwd(), 'uploads'),
);

try {
  fs.mkdirSync(uploadRoot, { recursive: true });
} catch (_) {}

server.use(
  '/uploads',
  express.static(uploadRoot, {
    acceptRanges: true,
    maxAge: '24h',
    fallthrough: false,
  }),
);

// Rewrite any /api/* missing /v1 to /api/v1/* automatically
server.use((req, res, next) => {
  if (req.url.startsWith('/api/') && !req.url.startsWith('/api/v1/')) {
    req.url = req.url.replace('/api/', '/api/v1/');
  }
  next();
});

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
