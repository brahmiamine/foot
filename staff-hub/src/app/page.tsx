import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserAccess } from "@/lib/access";
import { staffPortalService } from "@/services/StaffPortalService";
import { fetchNotifications } from "@/lib/notificationApi";
import { Card, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/format";
import { getTranslator } from "@/i18n/server";
import { countAvailability, getConvocationMessage } from "@/lib/dashboard";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;

  const { t, locale } = await getTranslator();
  const { teamId } = session.user;
  const access = await getUserAccess();
  const [roster, nextTraining, nextMatch, notifications] = await Promise.all([
    staffPortalService.getRoster(teamId, access.categories),
    staffPortalService.getNextTraining(teamId, access.categories),
    staffPortalService.getNextMatch(teamId),
    fetchNotifications(),
  ]);
  const availability = await staffPortalService.getAvailability(roster.map((player) => player.id));
  const counts = countAvailability(availability.values());

  let convocationRate: string | null = null;
  if (nextMatch) {
    const convocations = await staffPortalService.getConvocationsForMatch(
      teamId,
      nextMatch.kind,
      nextMatch.kind === "OFFICIAL" ? nextMatch.id : undefined,
      nextMatch.kind === "FRIENDLY" ? Number(nextMatch.id) : undefined,
    );
    const answered = convocations.filter((convocation) => convocation.response !== "PENDING").length;
    const message = getConvocationMessage(answered, convocations.length);
    convocationRate = t(message.key, message.values);
  }

  const unread = notifications.filter((notification) => !notification.readAt).slice(0, 3);

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <h1 style={{ fontSize: "1.3rem", margin: 0 }}>
        {t("dashboard.greeting", { name: session.user.name })}
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.9rem" }}>
        <StatCard label={t("dashboard.stats.roster")} value={String(roster.length)} tone="primary" />
        <StatCard label={t("dashboard.stats.available")} value={String(counts.AVAILABLE)} tone="success" />
        <StatCard label={t("dashboard.stats.injured")} value={String(counts.INJURED)} tone="warning" />
        <StatCard label={t("dashboard.stats.suspended")} value={String(counts.SUSPENDED)} tone="danger" />
      </div>

      <Card>
        <div style={{ fontSize: "0.8rem", color: "var(--sh-text-muted)", fontWeight: 600, marginBottom: 10 }}>
          {t("dashboard.nextTraining")}
        </div>
        {nextTraining ? (
          <div>
            <div style={{ fontWeight: 700 }}>{nextTraining.title}</div>
            <div style={{ color: "var(--sh-text-muted)", fontSize: "0.85rem" }}>
              {formatDateTime(nextTraining.date, locale)}
            </div>
          </div>
        ) : (
          <p style={{ color: "var(--sh-text-muted)", fontSize: "0.85rem", margin: 0 }}>
            {t("dashboard.noTraining")}
          </p>
        )}
      </Card>

      <Card>
        <div style={{ fontSize: "0.8rem", color: "var(--sh-text-muted)", fontWeight: 600, marginBottom: 10 }}>
          {t("dashboard.nextMatch")}
        </div>
        {nextMatch ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700 }}>
                {nextMatch.isHome ? "vs " : "@ "}{nextMatch.opponentName}
              </div>
              <div style={{ color: "var(--sh-text-muted)", fontSize: "0.85rem" }}>
                {formatDateTime(nextMatch.date, locale)}
              </div>
              {convocationRate && <div style={{ marginTop: 6 }}><Badge label={convocationRate} tone="info" /></div>}
            </div>
            <Link
              href="/composition"
              style={{ background: "var(--sh-primary)", color: "#fff", borderRadius: "var(--sh-radius-sm)", padding: "0.55rem 1rem", fontSize: "0.85rem", fontWeight: 600 }}
            >
              {t("dashboard.prepareLineup")}
            </Link>
          </div>
        ) : (
          <p style={{ color: "var(--sh-text-muted)", fontSize: "0.85rem", margin: 0 }}>
            {t("dashboard.noMatch")}
          </p>
        )}
      </Card>

      <Card>
        <div style={{ fontSize: "0.8rem", color: "var(--sh-text-muted)", fontWeight: 600, marginBottom: 10 }}>
          {t("dashboard.notifications.title")}
        </div>
        {unread.length === 0 ? (
          <p style={{ color: "var(--sh-text-muted)", fontSize: "0.85rem", margin: 0 }}>
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
