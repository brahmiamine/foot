import { notFound, redirect } from "next/navigation";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, can, categoryAllowed } from "@/lib/access";
import { FriendlyMatchService } from "@/services/FriendlyMatchService";
import { PlayerService } from "@/services/PlayerService";
import { MatchLineupService } from "@/services/MatchLineupService";
import { MatchFormationService } from "@/services/MatchFormationService";
import { EligibilityService } from "@/services/EligibilityService";
import { PitchLineupEditor } from "@/components/admin/PitchLineupEditor";

export const dynamic = "force-dynamic";

/** Page Composition — sélection des titulaires/remplaçants et formation pour un match amical. */
export default async function FriendlyMatchLineupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await params;
  const id = parseInt(idParam, 10);
  if (isNaN(id)) {
    notFound();
  }

  const teamId = await requireTeamId();
  const access = await getUserAccess();
  if (!can(access, "lineups.view")) {
    redirect("/admin/friendly-matches");
  }

  const friendlyMatchService = new FriendlyMatchService();
  const playerService = new PlayerService();
  const lineupService = new MatchLineupService();
  const formationService = new MatchFormationService();

  const match = await friendlyMatchService.findById(id, teamId);
  if (!match || !categoryAllowed(access, match.category)) {
    notFound();
  }

  const ref = { matchType: "FRIENDLY" as const, friendlyMatchId: id };

  const [playersData, lineupData, formation, isLocked] = await Promise.all([
    playerService.findAll(teamId, access.categories),
    lineupService.findByMatch(teamId, ref),
    formationService.getOrCreate(teamId, ref),
    formationService.isEffectivelyLocked(teamId, ref),
  ]);

  const activePlayers = playersData.filter((p) => p.isActive && p.category === match.category);
  const eligibilityService = new EligibilityService();
  const eligibilityMap = await eligibilityService.getEligibilityForPlayers(
    activePlayers.map((p) => p.id),
    teamId
  );

  const players = activePlayers.map((p) => {
    const eligibility = eligibilityMap.get(p.id);
    return {
      id: p.id,
      number: p.number,
      name: `${p.firstNameFr} ${p.lastNameFr}`,
      position: p.position ?? null,
      eligible: eligibility?.eligible,
      eligibilityReasons: eligibility?.reasons.map((r) => r.label),
    };
  });

  const lineup = lineupData.map((l) => ({
    playerId: l.playerId,
    role: l.role,
    shirtNumber: l.shirtNumber ?? null,
    position: l.position ?? null,
    posX: l.posX != null ? Number(l.posX) : null,
    posY: l.posY != null ? Number(l.posY) : null,
    isCaptain: l.isCaptain,
  }));

  const opponentName = match.opponentTeam?.nom ?? match.opponentName ?? "Adversaire";

  return (
    <PitchLineupEditor
      ref={ref}
      matchLabel={`${match.isHome ? "Domicile" : "Extérieur"} vs ${opponentName} (amical)`}
      matchDate={match.date.toISOString()}
      players={players}
      initialLineup={lineup}
      initialFormation={formation.formation}
      isLocked={isLocked}
      canEdit={can(access, "lineups.edit")}
      canSendConvocations={can(access, "convocations.send")}
      backHref="/admin/friendly-matches"
      backLabel="Retour aux matchs amicaux"
    />
  );
}
