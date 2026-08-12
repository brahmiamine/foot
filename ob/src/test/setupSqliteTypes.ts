import { vi } from "vitest";

/**
 * better-sqlite3 (utilisé par les tests pour exécuter du vrai SQL contre une
 * base jetable en mémoire, voir testDataSource.ts) ne supporte pas les types
 * de colonne MySQL 'enum' et 'char' utilisés par les entités de production
 * (Ticket, Team, Match, ... — 'char' apparaît aussi bien sur des `@Column`
 * que sur les clés primaires `@PrimaryColumn`, ex. Team.id/Match.id).
 * Plutôt que de dupliquer les entités pour les tests (au risque de dériver
 * du vrai schéma), on patch ces deux décorateurs pour substituer ces types
 * par leurs équivalents compatibles SQLite ('simple-enum', 'varchar') au
 * chargement des entités dans le test runner. N'affecte que la base de
 * test en mémoire ; le code de production ne passe jamais par Vitest.
 * Même pattern que arbinote/src/test/setupSqliteTypes.ts.
 */
vi.mock("typeorm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("typeorm")>();

  const SQLITE_TYPE_OVERRIDES: Record<string, string> = {
    enum: "simple-enum",
    char: "varchar",
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

  // better-sqlite3 ne supporte pas les verrous pessimistes (`lock: { mode:
  // "pessimistic_write" }`, voir releaseTickets dans src/lib/tickets.ts) —
  // SQLite est de toute façon mono-connexion/sérialisé, ce verrou n'a pas
  // d'équivalent utile en test. On retire `lock` des options de recherche
  // plutôt que de modifier le code de production (qui en a besoin sous
  // MySQL, seul driver utilisé hors tests).
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
  };
});
