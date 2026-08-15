import { auth } from "@/lib/auth";
import { playerPortalService } from "@/services/PlayerPortalService";
import { fetchNotifications } from "@/lib/notificationApi";
import { Card, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { ConvocationResponseButtons } from "@/components/portal/ConvocationResponse";
import { formatDateTime, formatShortDate } from "@/lib/format";
import { getTranslator } from "@/i18n/server";
import { getAgendaLabelKey, getAvailabilityLabelKey, getTrainingAttendance } from "@/lib/dashboard";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;

  const { t, locale } = await getTranslator();
  const { playerId, teamId, name } = session.user;
  const [nextConvocation, agenda, seasonSummary, availability, notifications, player] = await Promise.all([
    playerPortalService.getNextConvocation(playerId),
    playerPortalService.getAgenda(playerId, 7),
    playerPortalService.getSeasonSummary(playerId),
    playerPortalService.getAvailability(playerId, teamId),
    fetchNotifications(),
    playerPortalService.getPlayer(playerId),
  ]);
  const unread = notifications.filter((notification) => !notification.readAt).slice(0, 3);
  const myTeam = t("dashboard.myTeam");

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div>
        <h1 style={{ fontSize: "1.3rem", margin: "0 0 4px" }}>
          {t("dashboard.greeting", { name: player?.firstNameFr ?? name })}
        </h1>
        <p style={{ color: "var(--ph-text-muted)", fontSize: "0.85rem", margin: 0 }}>
          {t("dashboard.weekIntro")}
        </p>
      </div>

      <Card>
        <div style={{ fontSize: "0.8rem", color: "var(--ph-text-muted)", fontWeight: 600, marginBottom: 10 }}>
          {t("dashboard.nextMatch")}
        </div>
        {nextConvocation?.match ? (
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <div style={{ fontSize: "1.15rem", fontWeight: 700 }}>
                {nextConvocation.match.isHome ? myTeam : nextConvocation.match.opponentName} vs{" "}
                {nextConvocation.match.isHome ? nextConvocation.match.opponentName : myTeam}
              </div>
              <div style={{ color: "var(--ph-text-muted)", fontSize: "0.85rem" }}>
                {formatDateTime(nextConvocation.match.date, locale)}
              </div>
            </div>
            <ConvocationResponseButtons
              convocationId={nextConvocation.convocation.id}
              current={nextConvocation.convocation.response}
              cancelled={!!nextConvocation.convocation.cancelledAt}
            />
          </div>
        ) : (
          <EmptyState
            title={t("dashboard.noMatch.title")}
            description={t("dashboard.noMatch.description")}
          />
        )}
      </Card>

      <Card>
        <div style={{ fontSize: "0.8rem", color: "var(--ph-text-muted)", fontWeight: 600, marginBottom: 10 }}>
          {t("dashboard.thisWeek")}
        </div>
        {agenda.length === 0 ? (
          <p style={{ color: "var(--ph-text-muted)", fontSize: "0.85rem", margin: 0 }}>
            {t("dashboard.noAgenda")}
          </p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {agenda.map((entry) => (
              <div
                key={`${entry.type}-${entry.id}`}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid var(--ph-border)" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Badge
                    label={t(getAgendaLabelKey(entry.type))}
                    tone={entry.type === "MATCH" ? "danger" : "info"}
                  />
                  <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>{entry.title}</span>
                </div>
                <span style={{ fontSize: "0.8rem", color: "var(--ph-text-muted)" }}>
                  {formatShortDate(entry.date, locale)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.9rem" }}>
        <StatCard label={t("dashboard.stats.matchesPlayed")} value={String(seasonSummary.matches)} tone="primary" />
        <StatCard label={t("dashboard.stats.minutesPlayed")} value={String(seasonSummary.minutesPlayed)} />
        <StatCard label={t("dashboard.stats.goals")} value={String(seasonSummary.goals)} tone="success" />
        <StatCard label={t("dashboard.stats.assists")} value={String(seasonSummary.assists)} />
        <StatCard label={t("dashboard.stats.yellowCards")} value={String(seasonSummary.yellowCards)} tone="warning" />
        <StatCard
          label={t("dashboard.stats.trainingAttendance")}
          value={getTrainingAttendance(seasonSummary.trainingsAttended, seasonSummary.trainingsTotal)}
        />
      </div>

      <Card>
        <div style={{ fontSize: "0.8rem", color: "var(--ph-text-muted)", fontWeight: 600, marginBottom: 10 }}>
          {t("dashboard.status.title")}
        </div>
        <Badge
          label={t(getAvailabilityLabelKey(availability.available, availability.reason))}
          tone={availability.available ? "success" : "danger"}
        />
      </Card>

      <Card>
        <div style={{ fontSize: "0.8rem", color: "var(--ph-text-muted)", fontWeight: 600, marginBottom: 10 }}>
          {t("dashboard.notifications.title")}
        </div>
        {unread.length === 0 ? (
          <p style={{ color: "var(--ph-text-muted)", fontSize: "0.85rem", margin: 0 }}>
            {t("dashboard.notifications.empty")}
          </p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {unread.map((notification) => (
              <div key={notification.id} style={{ fontSize: "0.85rem" }}>• {notification.title}</div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
