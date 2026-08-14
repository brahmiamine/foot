import { auth } from "@/lib/auth";
import { getUserAccess } from "@/lib/access";
import { staffPortalService } from "@/services/StaffPortalService";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { formatDateTime } from "@/lib/format";

const TYPE_META: Record<string, { label: string; tone: "danger" | "info" | "neutral" }> = {
  MATCH: { label: "Match", tone: "danger" },
  TRAINING: { label: "Entraînement", tone: "info" },
  TRIP: { label: "Déplacement", tone: "neutral" },
};

export default async function CalendrierPage() {
  const session = await auth();
  if (!session) return null;
  const access = await getUserAccess();

  const agenda = await staffPortalService.getAgenda(session.user.teamId, access.categories, 30);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1 style={{ fontSize: "1.2rem", margin: 0 }}>Calendrier</h1>
      <p style={{ color: "var(--sh-text-muted)", fontSize: "0.85rem", margin: 0 }}>Les 30 prochains jours.</p>

      {agenda.length === 0 && <EmptyState title="Rien de prévu" description="Aucun événement dans les 30 prochains jours." />}

      {agenda.map((entry) => (
        <Card key={`${entry.type}-${entry.id}`}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Badge label={TYPE_META[entry.type].label} tone={TYPE_META[entry.type].tone} />
              <span style={{ fontWeight: 700 }}>{entry.title}</span>
            </div>
            <span style={{ color: "var(--sh-text-muted)", fontSize: "0.85rem" }}>{formatDateTime(entry.date)}</span>
          </div>
        </Card>
      ))}
    </div>
  );
}
