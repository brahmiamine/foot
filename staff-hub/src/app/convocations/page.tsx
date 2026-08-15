import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserAccess, can } from "@/lib/access";
import { staffPortalService } from "@/services/StaffPortalService";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { CreateConvocationForm } from "@/components/portal/CreateConvocationForm";
import { formatDateTime } from "@/lib/format";

const RESPONSE_LABEL: Record<string, { label: string; tone: "success" | "danger" | "neutral" }> = {
  PRESENT: { label: "Présent", tone: "success" },
  ABSENT: { label: "Absent", tone: "danger" },
  PENDING: { label: "En attente", tone: "neutral" },
};

export default async function ConvocationsPage() {
  const session = await auth();
  if (!session) return null;
  const access = await getUserAccess();
  if (!can(access, "convocations.view")) redirect("/");

  const { teamId } = session.user;
  const [convocations, matches, roster] = await Promise.all([
    staffPortalService.listConvocations(teamId),
    staffPortalService.listMatches(teamId),
    staffPortalService.getRoster(teamId, access.categories),
  ]);

  const upcomingMatches = matches.filter((match) => match.status !== "FINISHED" && match.status !== "CANCELLED");
  const displayedConvocations = convocations.slice(0, 50);
  const matchesByConvocation = await staffPortalService.resolveConvocationMatches(displayedConvocations);
  const withMatchInfo = displayedConvocations.map((convocation) => ({
    convocation,
    match: matchesByConvocation.get(convocation.id) ?? null,
  }));
  const rosterById = new Map(
    roster.map((player) => [player.id, `${player.number} — ${player.firstNameFr} ${player.lastNameFr}`]),
  );

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <h1 style={{ fontSize: "1.2rem", margin: 0 }}>Convocations</h1>
        {can(access, "convocations.send") && (
          <CreateConvocationForm
            matches={upcomingMatches}
            roster={roster.map((player) => ({
              id: player.id,
              label: `${player.number} — ${player.firstNameFr} ${player.lastNameFr}`,
            }))}
          />
        )}
      </div>

      {withMatchInfo.length === 0 && (
        <EmptyState title="Aucune convocation" description="Aucune convocation envoyée pour l'instant." />
      )}

      {withMatchInfo.map(({ convocation, match }) => (
        <Card key={convocation.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 700 }}>{rosterById.get(convocation.playerId) ?? convocation.playerId}</div>
              <div style={{ color: "var(--sh-text-muted)", fontSize: "0.85rem" }}>
                {match ? `${match.isHome ? "vs " : "@ "}${match.opponentName} — ${formatDateTime(match.date)}` : "Match"}
              </div>
            </div>
            <Badge
              label={RESPONSE_LABEL[convocation.response]?.label ?? convocation.response}
              tone={RESPONSE_LABEL[convocation.response]?.tone ?? "neutral"}
            />
          </div>
        </Card>
      ))}
    </div>
  );
}
