import { auth } from "@/lib/auth";
import { playerPortalService } from "@/services/PlayerPortalService";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/format";
import { AvailabilityDeclarationForm } from "./AvailabilityDeclarationForm";

const SEVERITY_LABEL: Record<string, string> = { MINOR: "Légère", MODERATE: "Modérée", SEVERE: "Sévère" };
const STATUS_LABEL: Record<string, string> = { ONGOING: "En cours", RECOVERING: "En récupération", RESOLVED: "Résolue" };

export default async function DisponibilitePage() {
  const session = await auth();
  if (!session) return null;

  const [availability, declarations] = await Promise.all([
    playerPortalService.getAvailability(session.user.playerId, session.user.teamId),
    playerPortalService.listMyAvailabilityDeclarations(session.user.playerId),
  ]);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1 style={{ fontSize: "1.2rem", margin: 0 }}>Ma disponibilité</h1>

      <Card>
        {availability.available ? (
          <Badge label="✅ Disponible" tone="success" />
        ) : (
          <Badge label={availability.reason === "INJURED" ? "🩺 Blessé" : "🟥 Suspendu"} tone="danger" />
        )}
      </Card>

      {availability.injury && (
        <Card>
          <div style={{ fontSize: "0.8rem", color: "var(--ph-text-muted)", fontWeight: 600, marginBottom: 10 }}>Blessure</div>
          <div style={{ display: "grid", gap: 8, fontSize: "0.9rem" }}>
            <div>
              <strong>Zone :</strong> {availability.injury.zone}
            </div>
            <div>
              <strong>Gravité :</strong> {SEVERITY_LABEL[availability.injury.severity] ?? availability.injury.severity}
            </div>
            <div>
              <strong>Statut :</strong> {STATUS_LABEL[availability.injury.status] ?? availability.injury.status}
            </div>
            {availability.injury.expectedReturnDate && (
              <div>
                <strong>Retour estimé :</strong> {formatDate(availability.injury.expectedReturnDate)}
              </div>
            )}
            {availability.injury.progressiveReturn && (
              <div>
                <Badge label="Reprise progressive" tone="info" />
              </div>
            )}
          </div>
        </Card>
      )}

      {availability.activeSuspension && (
        <Card>
          <div style={{ fontSize: "0.8rem", color: "var(--ph-text-muted)", fontWeight: 600, marginBottom: 10 }}>Suspension</div>
          <div style={{ fontSize: "0.9rem" }}>
            {availability.activeSuspension.matchesPurged} / {availability.activeSuspension.matchesCount} matchs purgés
          </div>
        </Card>
      )}

      <AvailabilityDeclarationForm
        declarations={declarations.map((d) => ({
          id: d.id,
          status: d.status,
          startDate: d.startDate,
          endDate: d.endDate,
          reason: d.reason ?? null,
          cancelledAt: d.cancelledAt ? d.cancelledAt.toISOString() : null,
        }))}
      />
    </div>
  );
}
