import 'dotenv/config';
import { optimizeDatabaseUrl } from './prisma/prisma.service';

// Ensure Supabase connection uses port 6543 (transaction pooler) with optimal pooling
optimizeDatabaseUrl();

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
      const isLocalOrLan = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(origin);
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin) || isLocalOrLan) {
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

  // Serve self-recorded uploads (Live Studio "Tự ghi hình" flow).
  // Files are written to <cwd>/uploads/ by StorageService and read
  // back here. We sit OUTSIDE the /api prefix so mobile players
  // can fetch them as plain MP4s without auth.
  const expressStatic = require('express');
  const pathModule = require('path');
  const fsModule = require('fs');
  const isServerless =
    Boolean(process.env.VERCEL) ||
    Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME) ||
    Boolean(process.env.LAMBDA_TASK_ROOT) ||
    (typeof process.cwd === 'function' && process.cwd().startsWith('/var/task'));

  const uploadRoot = pathModule.resolve(
    process.env.UPLOAD_ROOT && !process.env.UPLOAD_ROOT.startsWith('/var/task')
      ? process.env.UPLOAD_ROOT
      : isServerless
      ? pathModule.join('/tmp', 'uploads')
      : pathModule.join(process.cwd(), 'uploads'),
  );
  try {
    fsModule.mkdirSync(uploadRoot, { recursive: true });
  } catch (_) {/* read-only FS */}
  app.use(
    '/uploads',
    expressStatic.static(uploadRoot, {
      // Allow the player to do range requests so seeking works.
      acceptRanges: true,
      // 24h cache — files are content-addressed, so the URL
      // already includes a content hash.
      maxAge: '24h',
      fallthrough: false,
    }),
  );

  // Swagger Documentation Setup
  setupSwagger(app);

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  logger.log(`🚀 OmniCast API is running on port ${port}`, 'Bootstrap');
  logger.log(`📚 Swagger Docs: /swagger`, 'Bootstrap');

  // Surface which AI Curator pipeline is wired up. This mirrors the
  // `hasRealModel` flag computed in `AiCuratorService`:
  //   key empty OR === "dummy-key"  → heuristic-fallback-v1
  //   any other non-empty string     → gpt-4o-omnicast-v3
  //
  // Bumped to include the prompt version (curator-prompt-v4.0.0) so
  // you can verify in Vercel logs which prompt family is live. See
  // backend/src/ai-curator/ai-curator.prompts.ts for the full prompt
  // template and version history.
  const openaiKey = configService.get<string>('OPENAI_API_KEY');
  const usingRealModel = !!openaiKey && openaiKey !== 'dummy-key';
  const modelTag = usingRealModel
    ? 'gpt-4o-omnicast-v3 (REAL — OpenAI GPT-4o, single consolidated call, Zod-validated, retry-aware)'
    : 'heuristic-fallback-v1 (no OPENAI_API_KEY — local rules engine)';
  logger.log(
    `🤖 AI Curator model: ${modelTag}`,
    'Bootstrap',
  );
  logger.log(
    `📝 AI Curator prompt: curator-prompt-v4.0.0 (consolidated, JSON schema + few-shot, 7 fallback categories)`,
    'Bootstrap',
  );
}

bootstrap();
