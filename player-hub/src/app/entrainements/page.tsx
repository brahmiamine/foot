import { auth } from "@/lib/auth";
import { playerPortalService } from "@/services/PlayerPortalService";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { TrainingResponseButtons } from "@/components/portal/TrainingResponse";
import { formatDateTime } from "@/lib/format";

const TYPE_LABEL: Record<string, string> = {
  TECHNIQUE: "Technique",
  PHYSIQUE: "Physique",
  TACTIQUE: "Tactique",
  PREPARATION_MATCH: "Préparation match",
  RECUPERATION: "Récupération",
  AUTRE: "Autre",
};

const RSVP_LABEL: Record<string, string> = {
  PENDING: "Réponse attendue",
  ACCEPTED: "Présence confirmée",
  DECLINED: "Indisponible",
};

export default async function EntrainementsPage() {
  const session = await auth();
  if (!session) return null;

  const trainings = await playerPortalService.getTrainingInvitations(session.user.playerId);
  const now = Date.now();

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1 style={{ fontSize: "1.2rem", margin: 0 }}>Mes entraînements</h1>

      {trainings.length === 0 && <EmptyState title="Aucun entraînement" description="Aucune séance ne vous a été assignée." />}

      {trainings.map(({ invitation, training }) => {
        const deadlinePassed = Boolean(
          training?.responseDeadline && training.responseDeadline.getTime() < now,
        );
        return (
          <Card key={invitation.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{training?.title ?? "Entraînement"}</div>
                <div style={{ color: "var(--ph-text-muted)", fontSize: "0.85rem" }}>{formatDateTime(training?.date)}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                  {training && <Badge label={TYPE_LABEL[training.trainingType] ?? training.trainingType} tone="info" />}
                  {training?.venueName && <Badge label={training.venueName} tone="neutral" />}
                  {training?.status === "CANCELLED" && <Badge label="Annulé" tone="danger" />}
                  <Badge
                    label={RSVP_LABEL[invitation.rsvpStatus] ?? invitation.rsvpStatus}
                    tone={invitation.rsvpStatus === "DECLINED" ? "danger" : invitation.rsvpStatus === "ACCEPTED" ? "success" : "neutral"}
                  />
                </div>
                {training?.responseDeadline && (
                  <div style={{ color: deadlinePassed ? "var(--ph-danger)" : "var(--ph-text-muted)", fontSize: "0.78rem", marginTop: 6 }}>
                    Réponse avant le {formatDateTime(training.responseDeadline)}
                  </div>
                )}
              </div>
            </div>
            {training?.status !== "CANCELLED" && (
              <div style={{ marginTop: 12 }}>
                <TrainingResponseButtons
                  invitationId={invitation.id}
                  current={invitation.rsvpStatus}
                  locked={deadlinePassed}
                />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
