import { auth } from "@/lib/auth";
import { playerPortalService } from "@/services/PlayerPortalService";
import { fetchNotifications } from "@/lib/notificationApi";
import { Card, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { ConvocationResponseButtons } from "@/components/portal/ConvocationResponse";
import { formatDateTime, formatShortDate } from "@/lib/format";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;
  const { playerId, teamId, name } = session.user;

  const [nextConvocation, agenda, seasonSummary, availability, notifications, player] = await Promise.all([
    playerPortalService.getNextConvocation(playerId),
    playerPortalService.getAgenda(playerId, 7),
    playerPortalService.getSeasonSummary(playerId),
    playerPortalService.getAvailability(playerId, teamId),
    fetchNotifications(),
    playerPortalService.getPlayer(playerId),
  ]);

  const unread = notifications.filter((n) => !n.readAt).slice(0, 3);

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <div>
        <h1 style={{ fontSize: "1.3rem", margin: "0 0 4px" }}>
          Bonjour {player?.firstNameFr ?? name} 👋
        </h1>
        <p style={{ color: "var(--ph-text-muted)", fontSize: "0.85rem", margin: 0 }}>
          Voici votre semaine.
        </p>
      </div>

      <Card>
        <div style={{ fontSize: "0.8rem", color: "var(--ph-text-muted)", fontWeight: 600, marginBottom: 10 }}>
          Prochain match
        </div>
        {nextConvocation?.match ? (
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <div style={{ fontSize: "1.15rem", fontWeight: 700 }}>
                {nextConvocation.match.isHome ? "Mon équipe" : nextConvocation.match.opponentName} vs{" "}
                {nextConvocation.match.isHome ? nextConvocation.match.opponentName : "Mon équipe"}
              </div>
              <div style={{ color: "var(--ph-text-muted)", fontSize: "0.85rem" }}>
                {formatDateTime(nextConvocation.match.date)}
              </div>
            </div>
            <ConvocationResponseButtons
              convocationId={nextConvocation.convocation.id}
              current={nextConvocation.convocation.response}
              cancelled={!!nextConvocation.convocation.cancelledAt}
            />
          </div>
        ) : (
          <EmptyState title="Aucun match programmé" description="Vous serez prévenu dès votre prochaine convocation." />
        )}
      </Card>

      <Card>
        <div style={{ fontSize: "0.8rem", color: "var(--ph-text-muted)", fontWeight: 600, marginBottom: 10 }}>
          Cette semaine
        </div>
        {agenda.length === 0 ? (
          <p style={{ color: "var(--ph-text-muted)", fontSize: "0.85rem", margin: 0 }}>Rien de prévu cette semaine.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {agenda.map((entry) => (
              <div
                key={`${entry.type}-${entry.id}`}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0", borderBottom: "1px solid var(--ph-border)" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Badge label={entry.type === "MATCH" ? "Match" : "Entraînement"} tone={entry.type === "MATCH" ? "danger" : "info"} />
                  <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>{entry.title}</span>
                </div>
                <span style={{ fontSize: "0.8rem", color: "var(--ph-text-muted)" }}>{formatShortDate(entry.date)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.9rem" }}>
        <StatCard label="Matchs joués" value={String(seasonSummary.matches)} tone="primary" />
        <StatCard label="Minutes jouées" value={String(seasonSummary.minutesPlayed)} />
        <StatCard label="Buts" value={String(seasonSummary.goals)} tone="success" />
        <StatCard label="Passes décisives" value={String(seasonSummary.assists)} />
        <StatCard label="Cartons jaunes" value={String(seasonSummary.yellowCards)} tone="warning" />
        <StatCard
          label="Présence entraînements"
          value={seasonSummary.trainingsTotal > 0 ? `${Math.round((seasonSummary.trainingsAttended / seasonSummary.trainingsTotal) * 100)}%` : "—"}
        />
      </div>

      <Card>
        <div style={{ fontSize: "0.8rem", color: "var(--ph-text-muted)", fontWeight: 600, marginBottom: 10 }}>
          Mon état
        </div>
        {availability.available ? (
          <Badge label="✅ Disponible" tone="success" />
        ) : (
          <Badge label={availability.reason === "INJURED" ? "🩺 Blessé" : "🟥 Suspendu"} tone="danger" />
        )}
      </Card>

      <Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: "0.8rem", color: "var(--ph-text-muted)", fontWeight: 600 }}>Notifications</div>
        </div>
        {unread.length === 0 ? (
          <p style={{ color: "var(--ph-text-muted)", fontSize: "0.85rem", margin: 0 }}>Aucune notification non lue.</p>
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
