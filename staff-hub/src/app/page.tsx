import { auth } from "@/lib/auth";
import { getUserAccess } from "@/lib/access";
import { staffPortalService } from "@/services/StaffPortalService";
import { fetchNotifications } from "@/lib/notificationApi";
import { Card, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/format";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;
  const { teamId } = session.user;
  const access = await getUserAccess();

  const [roster, nextTraining, nextMatch, notifications] = await Promise.all([
    staffPortalService.getRoster(teamId, access.categories),
    staffPortalService.getNextTraining(teamId, access.categories),
    staffPortalService.getNextMatch(teamId),
    fetchNotifications(),
  ]);

  const availability = await staffPortalService.getAvailability(roster.map((p) => p.id));
  const counts = { AVAILABLE: 0, INJURED: 0, SUSPENDED: 0 };
  for (const status of availability.values()) counts[status]++;

  let convocationRate: string | null = null;
  if (nextMatch) {
    const convocations = await staffPortalService.getConvocationsForMatch(
      teamId,
      nextMatch.kind,
      nextMatch.kind === "OFFICIAL" ? nextMatch.id : undefined,
      nextMatch.kind === "FRIENDLY" ? Number(nextMatch.id) : undefined
    );
    const answered = convocations.filter((c) => c.response !== "PENDING").length;
    convocationRate = convocations.length > 0 ? `${answered} / ${convocations.length} réponses` : "Aucune convocation envoyée";
  }

  const unread = notifications.filter((n) => !n.readAt).slice(0, 3);

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <h1 style={{ fontSize: "1.3rem", margin: 0 }}>Bonjour {session.user.name} 👋</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.9rem" }}>
        <StatCard label="Effectif" value={String(roster.length)} tone="primary" />
        <StatCard label="Disponibles" value={String(counts.AVAILABLE)} tone="success" />
        <StatCard label="Blessés" value={String(counts.INJURED)} tone="warning" />
        <StatCard label="Suspendus" value={String(counts.SUSPENDED)} tone="danger" />
      </div>

      <Card>
        <div style={{ fontSize: "0.8rem", color: "var(--sh-text-muted)", fontWeight: 600, marginBottom: 10 }}>Prochain entraînement</div>
        {nextTraining ? (
          <div>
            <div style={{ fontWeight: 700 }}>{nextTraining.title}</div>
            <div style={{ color: "var(--sh-text-muted)", fontSize: "0.85rem" }}>{formatDateTime(nextTraining.date)}</div>
          </div>
        ) : (
          <p style={{ color: "var(--sh-text-muted)", fontSize: "0.85rem", margin: 0 }}>Aucun entraînement programmé.</p>
        )}
      </Card>

      <Card>
        <div style={{ fontSize: "0.8rem", color: "var(--sh-text-muted)", fontWeight: 600, marginBottom: 10 }}>Prochain match</div>
        {nextMatch ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 700 }}>
                {nextMatch.isHome ? "vs " : "@ "}
                {nextMatch.opponentName}
              </div>
              <div style={{ color: "var(--sh-text-muted)", fontSize: "0.85rem" }}>{formatDateTime(nextMatch.date)}</div>
              {convocationRate && (
                <div style={{ marginTop: 6 }}>
                  <Badge label={convocationRate} tone="info" />
                </div>
              )}
            </div>
            <Link
              href="/composition"
              style={{ background: "var(--sh-primary)", color: "#fff", borderRadius: "var(--sh-radius-sm)", padding: "0.55rem 1rem", fontSize: "0.85rem", fontWeight: 600 }}
            >
              Préparer composition
            </Link>
          </div>
        ) : (
          <p style={{ color: "var(--sh-text-muted)", fontSize: "0.85rem", margin: 0 }}>Aucun match programmé.</p>
        )}
      </Card>

      <Card>
        <div style={{ fontSize: "0.8rem", color: "var(--sh-text-muted)", fontWeight: 600, marginBottom: 10 }}>Notifications</div>
        {unread.length === 0 ? (
          <p style={{ color: "var(--sh-text-muted)", fontSize: "0.85rem", margin: 0 }}>Aucune notification non lue.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {unread.map((n) => (
              <div key={n.id} style={{ fontSize: "0.85rem" }}>
                • {n.title}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
