import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserAccess, can } from "@/lib/access";
import { staffPortalService } from "@/services/StaffPortalService";
import { getDataSource } from "@/lib/database";
import { Training } from "@/entities/Training";
import { Card } from "@/components/ui/Card";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/States";
import { InviteRosterButton } from "@/components/portal/InviteRosterButton";
import { AttendanceRow } from "@/components/portal/AttendanceRow";
import { formatDateTime } from "@/lib/format";

const RESPONSE_LABEL: Record<string, string> = { PENDING: "En attente", PRESENT: "Présent", ABSENT: "Absent", LATE: "Retard", INJURED: "Blessé" };

export default async function TrainingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session) return null;
  const access = await getUserAccess();
  if (!can(access, "trainings.view")) redirect("/");

  const ds = await getDataSource();
  const training = await ds.getRepository(Training).findOne({ where: { id: Number(id), teamId: session.user.teamId } });
  if (!training) redirect("/entrainements");

  const invitations = await staffPortalService.getInvitationsForTraining(Number(id));

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1 style={{ fontSize: "1.2rem", margin: 0 }}>{training.title}</h1>
      <p style={{ color: "var(--sh-text-muted)", fontSize: "0.85rem", margin: 0 }}>{formatDateTime(training.date)}</p>

      {can(access, "trainings.invite") && training.status !== "CANCELLED" && (
        <div>
          <InviteRosterButton trainingId={Number(id)} />
        </div>
      )}

      <Card>
        {invitations.length === 0 ? (
          <EmptyState title="Personne d'invité" description="Utilisez le bouton ci-dessus pour inviter l'effectif de la catégorie." />
        ) : (
          <Table>
            <Thead>
              <Th>Joueur</Th>
              <Th>Réponse</Th>
              {can(access, "trainings.invite") && <Th>Présence</Th>}
            </Thead>
            <tbody>
              {invitations.map(({ invitation, player }) => (
                <Tr key={invitation.id}>
                  <Td>{player ? `${player.firstNameFr} ${player.lastNameFr}` : "Joueur inconnu"}</Td>
                  <Td>{RESPONSE_LABEL[invitation.response] ?? invitation.response}</Td>
                  {can(access, "trainings.invite") && (
                    <Td>
                      <AttendanceRow invitationId={invitation.id} current={invitation.response} />
                    </Td>
                  )}
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
