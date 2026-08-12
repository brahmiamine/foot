import { vi } from "vitest";

/**
 * better-sqlite3 (utilisé par les tests pour exécuter du vrai SQL contre une
 * base jetable en mémoire, voir testDataSource.ts) ne supporte pas les types
 * de colonne MySQL 'enum', 'char', 'timestamp' utilisés par les entités de
 * production, ni les verrous pessimistes. Plutôt que de dupliquer les
 * entités pour les tests (au risque de dériver du vrai schéma), on patch
 * les décorateurs concernés pour substituer ces types par leurs équivalents
 * compatibles SQLite au chargement des entités dans le test runner. N'affecte
 * que la base de test en mémoire ; le code de production ne passe jamais
 * par Vitest. Même pattern que billetterie/matchsheet/superadmin
 * (src/test/setupSqliteTypes.ts).
 */
vi.mock("typeorm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("typeorm")>();

  const SQLITE_TYPE_OVERRIDES: Record<string, string> = {
    timestamp: "datetime",
    enum: "simple-enum",
    char: "varchar",
    // better-sqlite3 only allows AUTOINCREMENT on a column declared exactly
    // "INTEGER PRIMARY KEY" ; 'bigint' doesn't qualify.
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

  // ShopOrderService prend des verrous pessimistes non supportés par
  // better-sqlite3 — filet identique à billetterie/matchsheet.
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
    PrimaryGeneratedColumn: withTypeOverride(actual.PrimaryGeneratedColumn as (...args: unknown[]) => PropertyDecorator),
    CreateDateColumn: withTypeOverride(actual.CreateDateColumn as (...args: unknown[]) => PropertyDecorator),
    UpdateDateColumn: withTypeOverride(actual.UpdateDateColumn as (...args: unknown[]) => PropertyDecorator),
  };
});
