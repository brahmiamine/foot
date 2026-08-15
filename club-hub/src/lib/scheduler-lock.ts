import { getDataSource } from "@/lib/database";

/**
 * Exécute un job périodique sous verrou distribué MariaDB.
 *
 * GET_LOCK est attaché à la connexion SQL : on garde donc le même QueryRunner
 * jusqu'à la fin du job. Si le process meurt, MariaDB libère automatiquement
 * le verrou avec la connexion, ce qui évite un verrou orphelin.
 */
export async function runWithSchedulerLock<T>(
  lockName: string,
  task: () => Promise<T>
): Promise<{ ran: boolean; value?: T }> {
  const dataSource = await getDataSource();
  const runner = dataSource.createQueryRunner();
  await runner.connect();

  try {
    const rows = (await runner.query("SELECT GET_LOCK(?, 0) AS acquired", [lockName])) as Array<{
      acquired: number | string | null;
    }>;
    const acquired = Number(rows[0]?.acquired ?? 0) === 1;
    if (!acquired) return { ran: false };

    try {
      return { ran: true, value: await task() };
    } finally {
      await runner.query("SELECT RELEASE_LOCK(?)", [lockName]);
    }
  } finally {
    await runner.release();
  }
}
