import { getDataSource } from "@/lib/database";

/** Ensure one ticketing replica executes a periodic reconciliation at a time. */
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
    if (Number(rows[0]?.acquired ?? 0) !== 1) return { ran: false };

    try {
      return { ran: true, value: await task() };
    } finally {
      await runner.query("SELECT RELEASE_LOCK(?)", [lockName]);
    }
  } finally {
    await runner.release();
  }
}
