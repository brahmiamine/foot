import { redirect } from "next/navigation";
import { getSsoUserFromHeaders } from "@/lib/ssoUser";
import { PlatformNotificationService } from "@/services/PlatformNotificationService";
import { NotificationCenterList } from "./NotificationCenterList";

export const dynamic = "force-dynamic";

/** Page personnelle — historique complet des notifications centralisées (in-app + email) de l'utilisateur connecté. */
export default async function NotificationCenterPage() {
  const user = await getSsoUserFromHeaders();
  if (!user) {
    redirect("/");
  }

  const service = new PlatformNotificationService();
  const [notificationsData, preference] = await Promise.all([
    service.list(user.id, { limit: 50 }),
    service.getPreference(user.id),
  ]);

  const notifications = notificationsData.map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    url: n.url ?? null,
    isUrgent: n.isUrgent,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    createdAt: n.createdAt.toISOString(),
  }));

  return <NotificationCenterList initialNotifications={notifications} initialEmailEnabled={preference.emailEnabled} />;
}
