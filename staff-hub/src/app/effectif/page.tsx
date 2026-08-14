import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserAccess, can } from "@/lib/access";
import { staffPortalService } from "@/services/StaffPortalService";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";

const STATUS_META: Record<string, { label: string; tone: "success" | "warning" | "danger" }> = {
  AVAILABLE: { label: "Disponible", tone: "success" },
  INJURED: { label: "Blessé", tone: "warning" },
  SUSPENDED: { label: "Suspendu", tone: "danger" },
};

export default async function EffectifPage() {
  const session = await auth();
  if (!session) return null;
  const access = await getUserAccess();
  if (!can(access, "players.view")) redirect("/");

  const roster = await staffPortalService.getRoster(session.user.teamId, access.categories);
  const availability = await staffPortalService.getAvailability(roster.map((p) => p.id));

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1 style={{ fontSize: "1.2rem", margin: 0 }}>Effectif</h1>

      {roster.length === 0 ? (
        <EmptyState title="Aucun joueur" description="Aucun joueur dans votre périmètre." />
      ) : (
        <Table>
          <Thead>
            <Th>N°</Th>
            <Th>Nom</Th>
            <Th>Catégorie</Th>
            <Th>Poste</Th>
            <Th>Statut</Th>
          </Thead>
          <tbody>
            {roster.map((player) => {
              const status = availability.get(player.id) ?? "AVAILABLE";
              return (
                <Tr key={player.id}>
                  <Td>{player.number}</Td>
                  <Td>
                    {player.firstNameFr} {player.lastNameFr}
                  </Td>
                  <Td>{player.category}</Td>
                  <Td>{player.position ?? "—"}</Td>
                  <Td>
                    <Badge label={STATUS_META[status].label} tone={STATUS_META[status].tone} />
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
