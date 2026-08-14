import {
  ConsoleLogger,
  type LogLevel,
  type ConsoleLoggerOptions,
} from '@nestjs/common';
import { getCorrelationId } from '../correlation/correlation-context';

/**
 * TS-58 : logs structurés JSON (un objet par ligne), au lieu du format
 * texte coloré par défaut de Nest — `ConsoleLogger` (Nest 11) sait déjà
 * émettre du JSON (`json: true`), cette classe ajoute seulement `service`
 * (nom fixe de l'app, distinct de `context` qui reste le nom de
 * classe/module émetteur passé par chaque appelant, ex: `new
 * Logger(MyClass.name)`) et `correlationId` (TS-57, présent quand la
 * ligne est émise pendant le traitement d'une requête HTTP, `undefined`
 * sinon — ex: bootstrap, job planifié). Remplace le logger par défaut via
 * `app.useLogger(...)` dans `main.ts` — le reste du code continue
 * d'utiliser `new Logger(MyClass.name)` / l'injection `Logger` sans
 * modification, Nest route tout vers cette implémentation.
 */
export class StructuredLoggerService extends ConsoleLogger {
  constructor(
    private readonly service: string,
    options: Pick<ConsoleLoggerOptions, 'logLevels'> = {},
  ) {
    super({ json: true, colors: false, ...options });
  }

  protected getJsonLogObject(
    message: unknown,
    options: {
      context: string;
      logLevel: LogLevel;
      writeStreamType?: 'stdout' | 'stderr';
      errorStack?: unknown;
    },
  ): {
    level: LogLevel;
    pid: number;
    timestamp: number;
    message: unknown;
    context?: string;
    stack?: unknown;
    service: string;
    correlationId?: string;
  } {
    return {
      service: this.service,
      ...super.getJsonLogObject(message, options),
      correlationId: getCorrelationId(),
    };
  }
}
