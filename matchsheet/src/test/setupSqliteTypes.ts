import { vi } from "vitest";

/**
 * better-sqlite3 (utilisé par les tests pour exécuter du vrai SQL contre une
 * base jetable en mémoire, voir testDataSource.ts) ne supporte pas les types
 * de colonne MySQL 'enum', 'char' et 'timestamp' utilisés par les entités de
 * production (Card, Match, Team, ...). Plutôt que de dupliquer les entités
 * pour les tests (au risque de dériver du vrai schéma), on patch les
 * décorateurs `Column`/`PrimaryColumn` pour substituer ces types par leurs
 * équivalents compatibles SQLite ('simple-enum', 'varchar', 'datetime') au
 * chargement des entités dans le test runner. N'affecte que la base de test
 * en mémoire ; le code de production ne passe jamais par Vitest. Même
 * pattern que arbinote/src/test/setupSqliteTypes.ts et
 * billetterie/src/test/setupSqliteTypes.ts.
 */
vi.mock("typeorm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("typeorm")>();

  const SQLITE_TYPE_OVERRIDES: Record<string, string> = {
    enum: "simple-enum",
    char: "varchar",
    timestamp: "datetime",
    // better-sqlite3 only allows AUTOINCREMENT on a column declared exactly
    // "INTEGER PRIMARY KEY" ; 'bigint' (used by Sheet.id) doesn't qualify.
    bigint: "int",
  };

  function withTypeOverride(decorator: (...args: unknown[]) => PropertyDecorator) {
    return ((options?: unknown, ...rest: unknown[]) => {
      if (options && typeof options === "object" && "type" in options) {
        const type = (options as { type?: unknown }).type;
        if (typeof type === "string" && SQLITE_TYPE_OVERRIDES[type]) {
          options = { ...options, type: SQLITE_TYPE_OVERRIDES[type] };
        }
      }
      return decorator(options, ...rest);
    }) as typeof actual.Column;
  }

  // Certains services (voir tickets.ts côté billetterie) prennent un verrou
  // pessimiste non supporté par better-sqlite3 — filet identique ici par
  // cohérence, même si CardEventService ne s'en sert pas aujourd'hui.
  const originalFindOne = actual.EntityManager.prototype.findOne;
  actual.EntityManager.prototype.findOne = function (this: unknown, ...args: unknown[]) {
    const options = args[1];
    if (options && typeof options === "object" && "lock" in options) {
      const { lock: _lock, ...rest } = options as Record<string, unknown>;
      args[1] = rest;
    }
    return (originalFindOne as (...a: unknown[]) => unknown).apply(this, args);
  } as typeof actual.EntityManager.prototype.findOne;

  return {
    ...actual,
    Column: withTypeOverride(actual.Column as (...args: unknown[]) => PropertyDecorator),
    PrimaryColumn: withTypeOverride(actual.PrimaryColumn as (...args: unknown[]) => PropertyDecorator),
    CreateDateColumn: withTypeOverride(actual.CreateDateColumn as (...args: unknown[]) => PropertyDecorator),
    UpdateDateColumn: withTypeOverride(actual.UpdateDateColumn as (...args: unknown[]) => PropertyDecorator),
    PrimaryGeneratedColumn: withTypeOverride(actual.PrimaryGeneratedColumn as (...args: unknown[]) => PropertyDecorator),
  };
});
