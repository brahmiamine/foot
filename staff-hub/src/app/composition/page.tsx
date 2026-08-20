import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserAccess, can } from "@/lib/access";
import { staffPortalService } from "@/services/StaffPortalService";
import { Card } from "@/components/ui/Card";
import { FormField, Select } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/States";
import { LineupEditor } from "@/components/portal/LineupEditor";

export default async function CompositionPage({ searchParams }: { searchParams: Promise<{ match?: string }> }) {
  const session = await auth();
  if (!session) return null;
  const access = await getUserAccess();
  if (!can(access, "lineups.view")) redirect("/");

  const { teamId } = session.user;
  const { match: matchParam } = await searchParams;

  const matches = await staffPortalService.listMatches(teamId);
  const upcoming = matches.filter((match) => match.status !== "FINISHED" && match.status !== "CANCELLED");
  const selectedKey = matchParam ?? (upcoming[0] ? `${upcoming[0].kind}-${upcoming[0].id}` : null);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1 style={{ fontSize: "1.2rem", margin: 0 }}>Composition</h1>

      {upcoming.length === 0 ? (
        <EmptyState title="Aucun match à venir" description="Programmez un match pour préparer une composition." />
      ) : (
        <>
          <form method="GET" style={{ maxWidth: 320, display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <FormField label="Match">
                <Select name="match" defaultValue={selectedKey ?? undefined}>
                  {upcoming.map((match) => (
                    <option key={`${match.kind}-${match.id}`} value={`${match.kind}-${match.id}`}>
                      {match.isHome ? "vs " : "@ "}
                      {match.opponentName}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>
            <button
              type="submit"
              style={{ background: "var(--sh-primary)", color: "#fff", border: "none", borderRadius: "var(--sh-radius-sm)", padding: "0.55rem 1rem", fontSize: "0.85rem", fontWeight: 600, marginBottom: "1rem", cursor: "pointer" }}
            >
              Afficher
            </button>
          </form>

          {selectedKey && (
            <Card>
              <CompositionEditor
                teamId={teamId}
                userId={session.user.id}
                matchKey={selectedKey}
                categories={access.categories}
                canEdit={can(access, "lineups.edit")}
                canPropose={can(access, "lineups.propose")}
                canApprove={can(access, "lineups.approve")}
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
}

async function CompositionEditor({
  teamId,
  userId,
  matchKey,
  categories,
  canEdit,
  canPropose,
  canApprove,
}: {
  teamId: string;
  userId: string;
  matchKey: string;
  categories: Awaited<ReturnType<typeof getUserAccess>>["categories"];
  canEdit: boolean;
  canPropose: boolean;
  canApprove: boolean;
}) {
  const separator = matchKey.indexOf("-");
  if (separator < 0) throw new Error("Référence de match invalide");
  const kind = matchKey.slice(0, separator) as "OFFICIAL" | "FRIENDLY";
  const id = matchKey.slice(separator + 1);
  if ((kind !== "OFFICIAL" && kind !== "FRIENDLY") || !id) {
    throw new Error("Référence de match invalide");
  }

  const matchId = kind === "OFFICIAL" ? id : undefined;
  const friendlyMatchId = kind === "FRIENDLY" ? Number(id) : undefined;

  const [roster, lineup, formation, workflowStatus, delegatedApprove] = await Promise.all([
    staffPortalService.getRoster(teamId, categories),
    staffPortalService.getLineup(teamId, kind, matchId, friendlyMatchId),
    staffPortalService.getFormation(teamId, kind, matchId, friendlyMatchId),
    staffPortalService.getLineupWorkflowStatus(teamId, kind, matchId, friendlyMatchId),
    canApprove ? Promise.resolve(true) : staffPortalService.isHeadCoachDelegated(teamId, userId, { matchId, friendlyMatchId }),
  ]);

  const lineupByPlayer = new Map(lineup.map((entry) => [entry.playerId, entry]));
  const canApproveEffective = canApprove || delegatedApprove;
  const canInteract = canEdit || canPropose || canApproveEffective;

  if (!canInteract) {
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ fontWeight: 600 }}>Formation : {formation?.formation ?? "—"}</div>
        <div style={{ fontSize: "0.82rem", color: "var(--sh-text-muted)" }}>Statut : {workflowStatus}</div>
        {lineup.length === 0 ? (
          <p style={{ color: "var(--sh-text-muted)", fontSize: "0.85rem" }}>Aucune composition enregistrée.</p>
        ) : (
          lineup.map((entry) => {
            const player = roster.find((item) => item.id === entry.playerId);
            return (
              <div key={entry.id} style={{ fontSize: "0.88rem" }}>
                {entry.role === "STARTER" ? "Titulaire" : "Remplaçant"} — {player ? `${player.firstNameFr} ${player.lastNameFr}` : entry.playerId}
                {entry.isCaptain ? " (C)" : ""}
              </div>
            );
          })
        )}
      </div>
    );
  }

  return (
    <LineupEditor
      matchType={kind}
      matchId={matchId}
      friendlyMatchId={friendlyMatchId}
      initialFormation={formation?.formation ?? "4-3-3"}
      workflowStatus={workflowStatus}
      canEdit={canEdit}
      canPropose={canPropose}
      canApprove={canApproveEffective}
      initialRoster={roster.map((player) => {
        const existing = lineupByPlayer.get(player.id);
        return {
          id: player.id,
          entryId: existing?.id ?? null,
          label: `${player.number} — ${player.firstNameFr} ${player.lastNameFr}`,
          role: existing?.role ?? "NONE",
          shirtNumber: existing?.shirtNumber ?? player.number,
          isCaptain: existing?.isCaptain ?? false,
        };
      })}
    />
  );
}
