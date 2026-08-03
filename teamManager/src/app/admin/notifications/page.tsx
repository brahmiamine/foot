import { requireTeamId } from "@/lib/team-context";
import { NotificationService } from "@/services/NotificationService";
import { MatchService } from "@/services/MatchService";
import { NotificationsManagement } from "./NotificationsManagement";

export const dynamic = "force-dynamic";

/** Page Notifications — annonces diffusées aux joueurs/staff/membres du club. */
export default async function NotificationsPage() {
  const teamId = await requireTeamId();
  const notificationService = new NotificationService();
  const matchService = new MatchService();

  const [notificationsData, matchesData] = await Promise.all([
    notificationService.findAll(teamId),
    matchService.findAll(teamId),
  ]);

  const notifications = notificationsData.map((n) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    targetType: n.targetType,
    matchLabel: n.match ? `${n.match.homeTeam?.nom ?? "?"} vs ${n.match.awayTeam?.nom ?? "?"}` : null,
    createdAt: n.createdAt.toISOString(),
  }));

  const matches = matchesData.map((m) => ({
    id: m.id,
    label: `J${m.matchday?.number ?? "?"} — ${m.homeTeam?.nom ?? ""} vs ${m.awayTeam?.nom ?? ""}`,
  }));

  return <NotificationsManagement initialNotifications={notifications} matches={matches} />;
}
