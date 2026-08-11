import webpush from "web-push";
import { getDataSource } from "@/lib/database";
import { ObPushSubscription } from "@/entities/ObPushSubscription";
import { ObNotificationPrefs } from "@/entities/ObNotificationPrefs";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.NOTIFICATION_VAPID_PUBLIC_KEY;
  const privateKey = process.env.NOTIFICATION_VAPID_PRIVATE_KEY;
  const subject = process.env.NOTIFICATION_VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function getVapidPublicKey(): string | null {
  return process.env.NOTIFICATION_VAPID_PUBLIC_KEY ?? null;
}

/** Envoie à un abonnement précis, purge l'abonnement s'il est mort (410/404). */
async function sendToSubscription(sub: ObPushSubscription, payload: PushPayload): Promise<void> {
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload)
    );
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410) {
      const dataSource = await getDataSource();
      await dataSource.getRepository(ObPushSubscription).delete({ id: sub.id });
    }
  }
}

export async function sendToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;
  const dataSource = await getDataSource();
  const subs = await dataSource.getRepository(ObPushSubscription).find({ where: { userId } });
  await Promise.all(subs.map((sub) => sendToSubscription(sub, payload)));
}

type PrefKey = keyof Omit<ObNotificationPrefs, "userId" | "updatedAt">;

/** Envoie à tous les membres ayant activé la préférence donnée. */
export async function notifyOptedIn(prefKey: PrefKey, payload: PushPayload): Promise<number> {
  if (!ensureConfigured()) return 0;
  const dataSource = await getDataSource();

  const prefRows = await dataSource
    .getRepository(ObNotificationPrefs)
    .createQueryBuilder("p")
    .where(`p.${snakeCase(prefKey)} = true`)
    .getMany();
  if (prefRows.length === 0) return 0;

  const userIds = prefRows.map((p) => p.userId);
  const subs = await dataSource
    .getRepository(ObPushSubscription)
    .find({ where: userIds.map((userId) => ({ userId })) });

  await Promise.all(subs.map((sub) => sendToSubscription(sub, payload)));
  return subs.length;
}

function snakeCase(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
