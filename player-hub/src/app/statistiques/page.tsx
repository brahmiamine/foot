import { auth } from "@/lib/auth";
import { playerPortalService } from "@/services/PlayerPortalService";
import { Card, StatCard } from "@/components/ui/Card";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/States";
import { formatDate } from "@/lib/format";

export default async function StatistiquesPage() {
  const session = await auth();
  if (!session) return null;

  const [summary, stats] = await Promise.all([
    playerPortalService.getSeasonSummary(session.user.playerId),
    playerPortalService.getStats(session.user.playerId),
  ]);

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <h1 style={{ fontSize: "1.2rem", margin: 0 }}>Mes statistiques</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.9rem" }}>
        <StatCard label="Matchs joués" value={String(summary.matches)} tone="primary" />
        <StatCard label="Minutes jouées" value={String(summary.minutesPlayed)} />
        <StatCard label="Buts" value={String(summary.goals)} tone="success" />
        <StatCard label="Passes décisives" value={String(summary.assists)} />
        <StatCard label="Cartons jaunes" value={String(summary.yellowCards)} tone="warning" />
        <StatCard label="Cartons rouges" value={String(summary.redCards)} tone="danger" />
      </div>

      <Card>
        <div style={{ fontSize: "0.8rem", color: "var(--ph-text-muted)", fontWeight: 600, marginBottom: 10 }}>Détail par entrée</div>
        {stats.length === 0 ? (
          <EmptyState title="Aucune statistique" description="Vos statistiques apparaîtront ici une fois saisies par le staff." />
        ) : (
          <Table>
            <Thead>
              <Th>Saison</Th>
              <Th>Minutes</Th>
              <Th>Buts</Th>
              <Th>Passes</Th>
              <Th>Jaunes</Th>
              <Th>Rouges</Th>
            </Thead>
            <tbody>
              {stats.map((s) => (
                <Tr key={s.id}>
                  <Td>{s.season ?? formatDate(s.createdAt)}</Td>
                  <Td>{s.minutesPlayed}</Td>
                  <Td>{s.goals}</Td>
                  <Td>{s.assists}</Td>
                  <Td>{s.yellowCards}</Td>
                  <Td>{s.redCards}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
