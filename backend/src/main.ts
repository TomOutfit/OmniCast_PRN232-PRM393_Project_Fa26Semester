// ============================================================
// OmniCast - Application Bootstrap
// ============================================================

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggerService } from './common/utils/logger.service';

import { setupSwagger } from './common/swagger/swagger.config';

async function bootstrap() {
  const logger = new LoggerService();

  const app = await NestFactory.create(AppModule, {
    logger,
  });

  const configService = app.get(ConfigService);

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
    origin: configService.get<string>('FRONTEND_URL', '*'),
    credentials: true,
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
