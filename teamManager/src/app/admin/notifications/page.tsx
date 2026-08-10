import { auth } from "@/lib/auth";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, selectableCategories } from "@/lib/access";
import { NotificationService } from "@/services/NotificationService";
import { MatchService } from "@/services/MatchService";
import { AGE_CATEGORIES } from "@/types/categories";
import { NotificationsManagement } from "./NotificationsManagement";

export const dynamic = "force-dynamic";

/** Page Communication — messages/annonces internes (club, coach, direction). */
export default async function NotificationsPage() {
  const session = await auth();
  const teamId = await requireTeamId();
  const access = await getUserAccess();
  const notificationService = new NotificationService();
  const matchService = new MatchService();

  const [notificationsData, matchesData] = await Promise.all([
    notificationService.findAll(teamId, access.categories),
    matchService.findAll(teamId),
  ]);

  if (session?.user) {
    await Promise.all(notificationsData.map((n) => notificationService.markAsRead(n.id, session.user.id)));
  }

  const notifications = await Promise.all(
    notificationsData.map(async (n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      targetType: n.targetType,
      category: n.category ?? null,
      isUrgent: n.isUrgent,
      matchLabel: n.match ? `${n.match.homeTeam?.nom ?? "?"} vs ${n.match.awayTeam?.nom ?? "?"}` : null,
      createdAt: n.createdAt.toISOString(),
      readCount: await notificationService.getReadCount(n.id),
    }))
  );

  const matches = matchesData.map((m) => ({
    id: m.id,
    label: `J${m.matchday?.number ?? "?"} — ${m.homeTeam?.nom ?? ""} vs ${m.awayTeam?.nom ?? ""}`,
  }));

  return (
    <NotificationsManagement
      initialNotifications={notifications}
      matches={matches}
      allowedCategories={selectableCategories(access, AGE_CATEGORIES)}
      canSendGlobal={access.categories === "ALL"}
    />
  );
}
