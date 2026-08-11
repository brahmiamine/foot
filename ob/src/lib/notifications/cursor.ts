import { getDataSource } from "@/lib/database";
import { ObNotificationCursor } from "@/entities/ObNotificationCursor";

/** Renvoie le dernier passage du tick pour `id`, ou il y a 1h par défaut (premier tick). */
export async function getCursor(id: string): Promise<Date> {
  const dataSource = await getDataSource();
  const row = await dataSource.getRepository(ObNotificationCursor).findOne({ where: { id } });
  return row?.lastCheckedAt ?? new Date(Date.now() - 60 * 60 * 1000);
}

export async function setCursor(id: string, at: Date): Promise<void> {
  const dataSource = await getDataSource();
  const repository = dataSource.getRepository(ObNotificationCursor);
  const existing = await repository.findOne({ where: { id } });
  if (existing) {
    existing.lastCheckedAt = at;
    await repository.save(existing);
  } else {
    await repository.save(repository.create({ id, lastCheckedAt: at }));
  }
}
