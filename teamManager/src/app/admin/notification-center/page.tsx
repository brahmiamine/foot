import { auth } from "@/lib/auth";
import { PlatformNotificationService } from "@/services/PlatformNotificationService";
import { NotificationCenterList } from "./NotificationCenterList";

export const dynamic = "force-dynamic";

/** Page personnelle — historique complet des notifications centralisées (in-app + email) de l'utilisateur connecté. */
export default async function NotificationCenterPage() {
  const session = await auth();
  const service = new PlatformNotificationService();

  const [notificationsData, preference] = await Promise.all([
    session?.user?.id ? service.list(session.user.id, { limit: 50 }) : Promise.resolve([]),
    session?.user?.id ? service.getPreference(session.user.id) : Promise.resolve({ emailEnabled: true }),
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
