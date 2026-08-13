import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { StructuredLoggerService } from './common/logging/structured-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // TS-58 : logs JSON structurés (service/correlationId/…) plutôt que le
    // format texte coloré par défaut — voir StructuredLoggerService.
    logger: new StructuredLoggerService('marketplace-api', {
      logLevels: ['error', 'warn', 'log'],
    }),
    // TASK-P0-004 : expose request.rawBody (Buffer), nécessaire pour
    // vérifier la signature HMAC du webhook payment-api sur les octets
    // exacts reçus (voir checkout.controller.ts) — n'affecte pas le
    // parsing JSON normal des autres routes.
    rawBody: true,
  });

  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT ?? 3011;
  await app.listen(port);
  Logger.log(`marketplace-api listening on port ${port}`, 'Bootstrap');
}

void bootstrap();
