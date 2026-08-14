import { vi } from "vitest";

/**
 * better-sqlite3 (utilisé par les tests pour exécuter du vrai SQL contre une
 * base jetable en mémoire, voir testDataSource.ts) ne supporte pas les types
 * de colonne MySQL 'enum' et 'char', ni le type 'json' (JSON binaire natif
 * MySQL — la variante portable de TypeORM est 'simple-json'). Plutôt que de
 * dupliquer les entités pour les tests (au risque de dériver du vrai
 * schéma), on patch le décorateur `Column` pour substituer ces types par
 * leurs équivalents compatibles SQLite au chargement des entités dans le
 * test runner. N'affecte que la base de test en mémoire ; le code de
 * production ne passe jamais par Vitest. Même pattern que
 * arbinote/src/test/setupSqliteTypes.ts et les autres apps du dépôt.
 */
vi.mock("typeorm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("typeorm")>();

  const SQLITE_TYPE_OVERRIDES: Record<string, string> = {
    enum: "simple-enum",
    char: "varchar",
    json: "simple-json",
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

  return {
    ...actual,
    Column: withTypeOverride(actual.Column as (...args: unknown[]) => PropertyDecorator),
    PrimaryColumn: withTypeOverride(actual.PrimaryColumn as (...args: unknown[]) => PropertyDecorator),
  };
});
