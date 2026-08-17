"use server";

import { revalidatePath } from "next/cache";
import { getSsoSession } from "@/lib/ssoSession";
import {
  markNotificationRead,
  markAllNotificationsRead,
  setLocale,
  registerPushSubscription,
  removePushSubscription,
  type NotificationLocale,
} from "@/lib/notificationApi";
import { updateMemberProfile, type MemberProfile } from "@/lib/ssoProfileClient";
import { notify } from "@/lib/notificationClient";
import { getTranslator } from "@/i18n/server";

async function requireMember() {
  const session = await getSsoSession();
  if (!session || session.role !== "MEMBER") throw new Error("Member authentication required");
  return session;
}

export async function markNotificationReadAction(id: string): Promise<void> {
  await requireMember();
  await markNotificationRead(id);
  revalidatePath("/espace-membre/notifications");
}

export async function markAllNotificationsReadAction(): Promise<void> {
  await requireMember();
  await markAllNotificationsRead();
  revalidatePath("/espace-membre/notifications");
}

export async function setNotificationLocaleAction(locale: NotificationLocale): Promise<void> {
  await requireMember();
  await setLocale(locale);
  revalidatePath("/espace-membre/preferences");
}

export async function registerPushSubscriptionAction(input: {
  deviceId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<void> {
  const { t } = await getTranslator();
  const session = await requireMember();
  await registerPushSubscription({ ...input, platform: "WEB" });
  revalidatePath("/espace-membre/preferences");
  await notify({
    type: "PUSH_SUBSCRIPTION_ADDED",
    userId: session.id,
    category: "SECURITY",
    title: t("notification.deviceAddedTitle"),
    body: t("notification.deviceAddedBody"),
    data: { deviceId: input.deviceId },
  });
}

export async function removePushSubscriptionAction(deviceId: string): Promise<void> {
  const { t } = await getTranslator();
  const session = await requireMember();
  await removePushSubscription(deviceId);
  revalidatePath("/espace-membre/preferences");
  await notify({
    type: "PUSH_SUBSCRIPTION_REMOVED",
    userId: session.id,
    category: "SECURITY",
    title: t("notification.deviceRemovedTitle"),
    body: t("notification.deviceRemovedBody"),
    data: { deviceId },
  });
}

export async function updateMemberProfileAction(input: {
  firstName: string;
  lastName: string;
  phoneNumber: string;
}): Promise<MemberProfile> {
  const { t } = await getTranslator();
  const session = await requireMember();
  const profile = await updateMemberProfile(input);
  revalidatePath("/espace-membre");
  await notify({
    type: "MEMBER_PROFILE_UPDATED",
    userId: session.id,
    category: "SECURITY",
    title: t("notification.profileUpdatedTitle"),
    body: t("notification.profileUpdatedBody"),
    data: { firstName: input.firstName, lastName: input.lastName },
  });
  return profile;
}
