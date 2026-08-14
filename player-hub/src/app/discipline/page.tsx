import { auth } from "@/lib/auth";
import { playerPortalService } from "@/services/PlayerPortalService";
import { Card } from "@/components/ui/Card";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { formatDate } from "@/lib/format";

const CARD_LABEL: Record<string, string> = { YELLOW: "Jaune", RED: "Rouge", DOUBLE_YELLOW: "Double jaune" };
const SUSPENSION_STATUS: Record<string, { label: string; tone: "danger" | "success" | "neutral" }> = {
  ACTIVE: { label: "En cours", tone: "danger" },
  PURGED: { label: "Purgée", tone: "success" },
  CANCELLED: { label: "Annulée", tone: "neutral" },
};
const FINE_STATUS: Record<string, { label: string; tone: "warning" | "success" | "danger" }> = {
  PENDING: { label: "En attente", tone: "warning" },
  PAID: { label: "Payée", tone: "success" },
  OVERDUE: { label: "En retard", tone: "danger" },
};

export default async function DisciplinePage() {
  const session = await auth();
  if (!session) return null;

  const { cards, suspensions, fines } = await playerPortalService.getDiscipline(session.user.playerId);

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <h1 style={{ fontSize: "1.2rem", margin: 0 }}>Ma discipline</h1>

      <Card>
        <div style={{ fontSize: "0.8rem", color: "var(--ph-text-muted)", fontWeight: 600, marginBottom: 10 }}>Cartons</div>
        {cards.length === 0 ? (
          <p style={{ color: "var(--ph-text-muted)", fontSize: "0.85rem", margin: 0 }}>Aucun carton cette saison.</p>
        ) : (
          <Table>
            <Thead>
              <Th>Date</Th>
              <Th>Type</Th>
              <Th>Minute</Th>
            </Thead>
            <tbody>
              {cards.map((c) => (
                <Tr key={c.id}>
                  <Td>{formatDate(c.createdAt)}</Td>
                  <Td>{CARD_LABEL[c.type] ?? c.type}</Td>
                  <Td>{c.minute ?? "—"}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <div style={{ fontSize: "0.8rem", color: "var(--ph-text-muted)", fontWeight: 600, marginBottom: 10 }}>Suspensions</div>
        {suspensions.length === 0 ? (
          <p style={{ color: "var(--ph-text-muted)", fontSize: "0.85rem", margin: 0 }}>Aucune suspension.</p>
        ) : (
          <Table>
            <Thead>
              <Th>Date</Th>
              <Th>Matchs</Th>
              <Th>Purgés</Th>
              <Th>Statut</Th>
            </Thead>
            <tbody>
              {suspensions.map((s) => (
                <Tr key={s.id}>
                  <Td>{formatDate(s.createdAt)}</Td>
                  <Td>{s.matchesCount}</Td>
                  <Td>{s.matchesPurged}</Td>
                  <Td>
                    <Badge label={SUSPENSION_STATUS[s.status]?.label ?? s.status} tone={SUSPENSION_STATUS[s.status]?.tone ?? "neutral"} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Card>
        <div style={{ fontSize: "0.8rem", color: "var(--ph-text-muted)", fontWeight: 600, marginBottom: 10 }}>Amendes</div>
        {fines.length === 0 ? (
          <p style={{ color: "var(--ph-text-muted)", fontSize: "0.85rem", margin: 0 }}>Aucune amende.</p>
        ) : (
          <Table>
            <Thead>
              <Th>Date</Th>
              <Th>Motif</Th>
              <Th>Montant</Th>
              <Th>Statut</Th>
            </Thead>
            <tbody>
              {fines.map((f) => (
                <Tr key={f.id}>
                  <Td>{formatDate(f.createdAt)}</Td>
                  <Td>{f.reasonFr}</Td>
                  <Td>{f.amount} DT</Td>
                  <Td>
                    <Badge label={FINE_STATUS[f.status]?.label ?? f.status} tone={FINE_STATUS[f.status]?.tone ?? "neutral"} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {cards.length === 0 && suspensions.length === 0 && fines.length === 0 && (
        <EmptyState title="Aucun antécédent" description="Continuez comme ça !" />
      )}
    </div>
  );
}
