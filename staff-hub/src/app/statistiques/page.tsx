import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserAccess, can } from "@/lib/access";
import { staffPortalService } from "@/services/StaffPortalService";
import { Card } from "@/components/ui/Card";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/States";
import { CreateStatForm } from "@/components/portal/CreateStatForm";
import { EditStatButton } from "@/components/portal/EditStatButton";

export default async function StatistiquesPage() {
  const session = await auth();
  if (!session) return null;
  const access = await getUserAccess();
  if (!can(access, "stats.view")) redirect("/");

  const { teamId } = session.user;
  const [stats, roster] = await Promise.all([
    staffPortalService.listStats(teamId, access.categories),
    staffPortalService.getRoster(teamId, access.categories),
  ]);
  const rosterById = new Map(roster.map((p) => [p.id, `${p.firstNameFr} ${p.lastNameFr}`]));

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <h1 style={{ fontSize: "1.2rem", margin: 0 }}>Statistiques</h1>
        {can(access, "stats.manage") && (
          <CreateStatForm roster={roster.map((p) => ({ id: p.id, label: `${p.number} — ${p.firstNameFr} ${p.lastNameFr}` }))} />
        )}
      </div>

      <Card>
        {stats.length === 0 ? (
          <EmptyState title="Aucune statistique" description="Aucune statistique saisie pour l'instant." />
        ) : (
          <Table>
            <Thead>
              <Th>Joueur</Th>
              <Th>Saison</Th>
              <Th>Minutes</Th>
              <Th>Buts</Th>
              <Th>Passes</Th>
              <Th>Jaunes</Th>
              <Th>Rouges</Th>
              <Th></Th>
            </Thead>
            <tbody>
              {stats.map((s) => (
                <Tr key={s.id}>
                  <Td>{rosterById.get(s.playerId) ?? s.playerId}</Td>
                  <Td>{s.season ?? "—"}</Td>
                  <Td>{s.minutesPlayed}</Td>
                  <Td>{s.goals}</Td>
                  <Td>{s.assists}</Td>
                  <Td>{s.yellowCards}</Td>
                  <Td>{s.redCards}</Td>
                  <Td>
                    {can(access, "stats.manage") && (
                      <EditStatButton
                        id={s.id}
                        minutesPlayed={s.minutesPlayed}
                        goals={s.goals}
                        assists={s.assists}
                        yellowCards={s.yellowCards}
                        redCards={s.redCards}
                      />
                    )}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
