import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { StructuredLoggerService } from './common/logging/structured-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // TS-58 : logs JSON structurés (service/correlationId/…) plutôt que le
    // format texte coloré par défaut — voir StructuredLoggerService.
    logger: new StructuredLoggerService('payments', {
      logLevels: ['error', 'warn', 'log'],
    }),
  });

  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  Logger.log(`payments listening on port ${port}`, 'Bootstrap');
}

void bootstrap();
