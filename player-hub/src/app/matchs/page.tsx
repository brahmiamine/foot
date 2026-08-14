import { auth } from "@/lib/auth";
import { playerPortalService } from "@/services/PlayerPortalService";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { formatDate } from "@/lib/format";

const STATUS_LABEL: Record<string, { label: string; tone: "success" | "info" | "danger" | "neutral" }> = {
  UPCOMING: { label: "À venir", tone: "info" },
  IN_PROGRESS: { label: "En cours", tone: "info" },
  FINISHED: { label: "Terminé", tone: "success" },
  CANCELLED: { label: "Annulé", tone: "danger" },
};

export default async function MatchsPage() {
  const session = await auth();
  if (!session) return null;

  const convocations = await playerPortalService.getConvocations(session.user.playerId);
  const matches = await Promise.all(
    convocations.map(async (convocation) => ({
      convocation,
      match: await playerPortalService.resolveConvocationMatch(convocation),
    }))
  );
  const withDate = matches.filter((m) => m.match?.date).sort((a, b) => b.match!.date!.getTime() - a.match!.date!.getTime());

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1 style={{ fontSize: "1.2rem", margin: 0 }}>Mes matchs</h1>

      {withDate.length === 0 ? (
        <EmptyState title="Aucun match" description="Vous n'avez pas encore été convoqué à un match." />
      ) : (
        <Table>
          <Thead>
            <Th>Date</Th>
            <Th>Adversaire</Th>
            <Th>Score</Th>
            <Th>Statut</Th>
            <Th>Ma réponse</Th>
          </Thead>
          <tbody>
            {withDate.map(({ convocation, match }) => (
              <Tr key={convocation.id}>
                <Td>{formatDate(match!.date)}</Td>
                <Td>
                  {match!.isHome ? "vs " : "@ "}
                  {match!.opponentName}
                </Td>
                <Td>{match!.scoreHome !== null && match!.scoreAway !== null ? `${match!.scoreHome} - ${match!.scoreAway}` : "—"}</Td>
                <Td>
                  <Badge
                    label={STATUS_LABEL[match!.status]?.label ?? match!.status}
                    tone={STATUS_LABEL[match!.status]?.tone ?? "neutral"}
                  />
                </Td>
                <Td>{convocation.response === "PENDING" ? "—" : convocation.response === "PRESENT" ? "Présent" : "Absent"}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
