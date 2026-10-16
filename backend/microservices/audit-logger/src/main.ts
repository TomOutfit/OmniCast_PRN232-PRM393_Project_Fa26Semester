// ============================================================
// OmniCast - Audit Logger gRPC Microservice: Bootstrap
// ============================================================

import { NestFactory } from '@nestjs/core';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'node:path';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const appContext = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const config = appContext.get(ConfigService);

  const grpcUrl = config.get<string>('AUDIT_LOGGER_GRPC_URL', '0.0.0.0:50051');
  const httpPort = Number(config.get<string>('AUDIT_LOGGER_HTTP_PORT', '3100'));
  const protoPath = join(__dirname, '..', 'protos', 'audit_logger.proto');

  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });

  // gRPC microservice transport
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'omnicast.audit.v1',
      protoPath,
      url: grpcUrl,
    },
  });

  await app.startAllMicroservices();
  await app.listen(httpPort, '0.0.0.0');

  logger.log(`gRPC Audit Logger listening on ${grpcUrl}`);
  logger.log(`HTTP /health on 0.0.0.0:${httpPort}`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to bootstrap audit-logger microservice', err);
  process.exit(1);
});
