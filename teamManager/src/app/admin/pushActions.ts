"use server";

import { auth } from "@/lib/auth";
import {
  fetchPushSubscriptions,
  registerPushSubscription,
  removePushSubscription,
  type PushSubscriptionRecord,
} from "@/lib/notificationApi";

async function requireStaff() {
  const session = await auth();
  if (!session?.user) throw new Error("Non authentifié");
  return session;
}

export async function fetchPushSubscriptionsAction(): Promise<PushSubscriptionRecord[]> {
  await requireStaff();
  return fetchPushSubscriptions();
}

export async function registerPushSubscriptionAction(input: {
  deviceId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<void> {
  await requireStaff();
  await registerPushSubscription({ ...input, platform: "WEB" });
}

export async function removePushSubscriptionAction(deviceId: string): Promise<void> {
  await requireStaff();
  await removePushSubscription(deviceId);
}
