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
  const upcoming = matches.filter((m) => m.status !== "FINISHED" && m.status !== "CANCELLED");
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
                  {upcoming.map((m) => (
                    <option key={`${m.kind}-${m.id}`} value={`${m.kind}-${m.id}`}>
                      {m.isHome ? "vs " : "@ "}
                      {m.opponentName}
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
              <CompositionEditor teamId={teamId} matchKey={selectedKey} categories={access.categories} canEdit={can(access, "lineups.edit")} />
            </Card>
          )}
        </>
      )}
    </div>
  );
}

async function CompositionEditor({
  teamId,
  matchKey,
  categories,
  canEdit,
}: {
  teamId: string;
  matchKey: string;
  categories: Awaited<ReturnType<typeof getUserAccess>>["categories"];
  canEdit: boolean;
}) {
  const [kind, id] = matchKey.split("-", 2) as ["OFFICIAL" | "FRIENDLY", string];
  const matchId = kind === "OFFICIAL" ? id : undefined;
  const friendlyMatchId = kind === "FRIENDLY" ? Number(id) : undefined;

  const [roster, lineup, formation] = await Promise.all([
    staffPortalService.getRoster(teamId, categories),
    staffPortalService.getLineup(teamId, kind, matchId, friendlyMatchId),
    staffPortalService.getFormation(teamId, kind, matchId, friendlyMatchId),
  ]);

  const lineupByPlayer = new Map(lineup.map((l) => [l.playerId, l]));

  if (!canEdit) {
    return (
      <div style={{ display: "grid", gap: 8 }}>
        <div style={{ fontWeight: 600 }}>Formation : {formation?.formation ?? "—"}</div>
        {lineup.length === 0 ? (
          <p style={{ color: "var(--sh-text-muted)", fontSize: "0.85rem" }}>Aucune composition enregistrée.</p>
        ) : (
          lineup.map((l) => {
            const player = roster.find((p) => p.id === l.playerId);
            return (
              <div key={l.id} style={{ fontSize: "0.88rem" }}>
                {l.role === "STARTER" ? "Titulaire" : "Remplaçant"} — {player ? `${player.firstNameFr} ${player.lastNameFr}` : l.playerId}
                {l.isCaptain ? " (C)" : ""}
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
      initialRoster={roster.map((p) => {
        const existing = lineupByPlayer.get(p.id);
        return {
          id: p.id,
          label: `${p.number} — ${p.firstNameFr} ${p.lastNameFr}`,
          role: existing?.role ?? "NONE",
          shirtNumber: existing?.shirtNumber ?? p.number,
          isCaptain: existing?.isCaptain ?? false,
        };
      })}
    />
  );
}
