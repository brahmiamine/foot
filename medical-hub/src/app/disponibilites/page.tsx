import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserAccess, can } from "@/lib/access";
import { medicalPortalService } from "@/services/MedicalPortalService";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";

export default async function DisponibilitesPage() {
  const session = await auth();
  if (!session) return null;
  const access = await getUserAccess();
  if (!can(access, "medical.view")) redirect("/");

  const { teamId } = session.user;
  const [roster, unavailable] = await Promise.all([
    medicalPortalService.rosterInCategories(teamId, access.categories),
    medicalPortalService.getUnavailablePlayers(teamId, access.categories),
  ]);
  const injuryByPlayer = new Map(unavailable.map(({ injury, player }) => [injury.playerId, { injury, player }]));

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1 style={{ fontSize: "1.2rem", margin: 0 }}>Disponibilités</h1>

      <Table>
        <Thead>
          <Th>Joueur</Th>
          <Th>Catégorie</Th>
          <Th>Statut</Th>
        </Thead>
        <tbody>
          {roster.map((player) => {
            const entry = injuryByPlayer.get(player.id);
            return (
              <Tr key={player.id}>
                <Td>
                  {player.number} — {player.firstNameFr} {player.lastNameFr}
                </Td>
                <Td>{player.category}</Td>
                <Td>
                  {entry ? (
                    <Badge label={entry.injury.status === "ONGOING" ? "Blessé" : "En récupération"} tone={entry.injury.status === "ONGOING" ? "danger" : "warning"} />
                  ) : (
                    <Badge label="Disponible" tone="success" />
                  )}
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}
