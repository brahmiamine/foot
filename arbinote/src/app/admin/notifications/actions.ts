"use server";

import { registerPushSubscription, removePushSubscription, type PushPlatform } from "@/lib/notificationClient";

export async function registerPushSubscriptionAction(input: {
  deviceId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<void> {
  const platform: PushPlatform = "WEB";
  await registerPushSubscription({ ...input, platform });
}

export async function removePushSubscriptionAction(deviceId: string): Promise<void> {
  await removePushSubscription(deviceId);
}
