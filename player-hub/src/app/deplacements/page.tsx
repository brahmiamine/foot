import { auth } from "@/lib/auth";
import { playerPortalService } from "@/services/PlayerPortalService";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { TripResponseForm } from "@/components/portal/TripResponse";
import { formatDateTime } from "@/lib/format";

export default async function DeplacementsPage() {
  const session = await auth();
  if (!session) return null;

  const trips = await playerPortalService.getTrips(session.user.playerId);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1 style={{ fontSize: "1.2rem", margin: 0 }}>Mes déplacements</h1>

      {trips.length === 0 && <EmptyState title="Aucun déplacement" description="Aucun déplacement ne vous concerne pour le moment." />}

      {trips.map(({ participant, trip }) => (
        <Card key={participant.id}>
          <div style={{ fontWeight: 700 }}>{trip?.meetingPoint ?? "Point de rendez-vous à confirmer"}</div>
          <div style={{ color: "var(--ph-text-muted)", fontSize: "0.85rem", marginBottom: 12 }}>
            Départ : {formatDateTime(trip?.departureTime)}
          </div>
          <TripResponseForm
            participantId={participant.id}
            current={participant.transportOffer}
            currentSeats={participant.offeredSeats ?? null}
          />
        </Card>
      ))}
    </div>
  );
}
