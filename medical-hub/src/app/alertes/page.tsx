import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getUserAccess, can } from "@/lib/access";
import { medicalPortalService } from "@/services/MedicalPortalService";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { formatDate } from "@/lib/format";

export default async function AlertesPage() {
  const session = await auth();
  if (!session) return null;
  const access = await getUserAccess();
  if (!can(access, "medical.view")) redirect("/");

  const alerts = await medicalPortalService.getAlerts(session.user.teamId, access.categories);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1 style={{ fontSize: "1.2rem", margin: 0 }}>Alertes</h1>
      <p style={{ color: "var(--mh-text-muted)", fontSize: "0.85rem", margin: 0 }}>
        Retours dépassés sans date effective, ou retours prévus dans les 3 prochains jours.
      </p>

      {alerts.length === 0 && <EmptyState title="Aucune alerte" />}

      {alerts.map(({ injury, player, kind, daysDiff }) => (
        <Card key={injury.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <Link href={`/blessures/${injury.id}`} style={{ fontWeight: 700, textDecoration: "underline" }}>
                {player ? `${player.firstNameFr} ${player.lastNameFr}` : injury.playerId} — {injury.zone}
              </Link>
              <div style={{ color: "var(--mh-text-muted)", fontSize: "0.85rem" }}>
                Retour estimé : {injury.expectedReturnDate ? formatDate(injury.expectedReturnDate) : "—"}
              </div>
            </div>
            <Badge label={kind === "OVERDUE" ? `Retour dépassé (${Math.abs(daysDiff)}j)` : `Retour dans ${daysDiff}j`} tone={kind === "OVERDUE" ? "danger" : "warning"} />
          </div>
        </Card>
      ))}
    </div>
  );
}
