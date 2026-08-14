import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserAccess, can } from "@/lib/access";
import { staffPortalService } from "@/services/StaffPortalService";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/States";

export default async function PresencesPage() {
  const session = await auth();
  if (!session) return null;
  const access = await getUserAccess();
  if (!can(access, "trainings.view")) redirect("/");

  const report = await staffPortalService.getAttendanceReport(session.user.teamId, access.categories);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1 style={{ fontSize: "1.2rem", margin: 0 }}>Présences</h1>

      {report.length === 0 ? (
        <EmptyState title="Aucune donnée" description="Aucun historique d'entraînement pour l'instant." />
      ) : (
        <Table>
          <Thead>
            <Th>Joueur</Th>
            <Th>Présences</Th>
            <Th>Taux</Th>
          </Thead>
          <tbody>
            {report.map(({ player, attended, total }) => (
              <Tr key={player.id}>
                <Td>
                  {player.firstNameFr} {player.lastNameFr}
                </Td>
                <Td>
                  {attended} / {total}
                </Td>
                <Td>{total > 0 ? `${Math.round((attended / total) * 100)}%` : "—"}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
