import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserAccess, can } from "@/lib/access";
import { staffPortalService } from "@/services/StaffPortalService";
import { getDataSource } from "@/lib/database";
import { Trip } from "@/entities/Trip";
import { Card } from "@/components/ui/Card";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { AddRosterToTripButton } from "@/components/portal/AddRosterToTripButton";
import { formatDateTime } from "@/lib/format";

const OFFER_LABEL: Record<string, { label: string; tone: "warning" | "success" | "neutral" }> = {
  NONE: { label: "Aucun besoin", tone: "neutral" },
  NEEDS_TRANSPORT: { label: "Besoin d'un transport", tone: "warning" },
  CAN_DRIVE: { label: "Peut transporter", tone: "success" },
};

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return null;
  const access = await getUserAccess();
  if (!can(access, "trips.view")) redirect("/");

  const ds = await getDataSource();
  const trip = await ds.getRepository(Trip).findOne({ where: { id: Number(id), teamId: session.user.teamId } });
  if (!trip) redirect("/deplacements");

  const participants = await staffPortalService.getTripParticipants(Number(id));

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1 style={{ fontSize: "1.2rem", margin: 0 }}>{trip.meetingPoint ?? "Déplacement"}</h1>
      <p style={{ color: "var(--sh-text-muted)", fontSize: "0.85rem", margin: 0 }}>Départ : {formatDateTime(trip.departureTime)}</p>

      {can(access, "trips.manage") && (
        <div>
          <AddRosterToTripButton tripId={Number(id)} />
        </div>
      )}

      <Card>
        {participants.length === 0 ? (
          <EmptyState title="Aucun participant" description="Utilisez le bouton ci-dessus pour ajouter l'effectif de la catégorie." />
        ) : (
          <Table>
            <Thead>
              <Th>Joueur</Th>
              <Th>Transport</Th>
              <Th>Places offertes</Th>
              <Th>Confirmé</Th>
            </Thead>
            <tbody>
              {participants.map(({ participant, player }) => (
                <Tr key={participant.id}>
                  <Td>{player ? `${player.firstNameFr} ${player.lastNameFr}` : participant.name ?? "—"}</Td>
                  <Td>
                    <Badge label={OFFER_LABEL[participant.transportOffer].label} tone={OFFER_LABEL[participant.transportOffer].tone} />
                  </Td>
                  <Td>{participant.offeredSeats ?? "—"}</Td>
                  <Td>{participant.confirmed ? "Oui" : "Non"}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
