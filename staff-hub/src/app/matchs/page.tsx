import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserAccess, can } from "@/lib/access";
import { staffPortalService } from "@/services/StaffPortalService";
import { Table, Thead, Th, Tr, Td } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { CreateFriendlyMatchForm } from "@/components/portal/CreateFriendlyMatchForm";
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
  const access = await getUserAccess();
  if (!can(access, "matches.view") && !can(access, "friendlyMatches.view")) redirect("/");

  const matches = await staffPortalService.listMatches(session.user.teamId);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <h1 style={{ fontSize: "1.2rem", margin: 0 }}>Matchs</h1>
        {can(access, "friendlyMatches.create") && <CreateFriendlyMatchForm categories={access.categories} />}
      </div>

      {matches.length === 0 ? (
        <EmptyState title="Aucun match" />
      ) : (
        <Table>
          <Thead>
            <Th>Date</Th>
            <Th>Type</Th>
            <Th>Adversaire</Th>
            <Th>Statut</Th>
          </Thead>
          <tbody>
            {matches.map((m) => (
              <Tr key={`${m.kind}-${m.id}`}>
                <Td>{formatDate(m.date)}</Td>
                <Td>
                  <Badge label={m.kind === "OFFICIAL" ? "Officiel" : "Amical"} tone="neutral" />
                </Td>
                <Td>
                  {m.isHome ? "vs " : "@ "}
                  {m.opponentName}
                </Td>
                <Td>
                  <Badge label={STATUS_LABEL[m.status]?.label ?? m.status} tone={STATUS_LABEL[m.status]?.tone ?? "neutral"} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
