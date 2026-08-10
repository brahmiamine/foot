import { notFound, redirect } from "next/navigation";
import { requireTeamId } from "@/lib/team-context";
import { getUserAccess, can } from "@/lib/access";
import { MatchService } from "@/services/MatchService";
import { PlayerService } from "@/services/PlayerService";
import { MatchLineupService } from "@/services/MatchLineupService";
import { MatchFormationService } from "@/services/MatchFormationService";
import { EligibilityService } from "@/services/EligibilityService";
import { PitchLineupEditor } from "@/components/admin/PitchLineupEditor";

export const dynamic = "force-dynamic";

/** Page Composition — sélection des titulaires/remplaçants et formation pour un match officiel. */
export default async function MatchLineupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: matchId } = await params;
  const teamId = await requireTeamId();
  const access = await getUserAccess();
  if (!can(access, "lineups.view")) {
    redirect("/admin/matches");
  }

  const matchService = new MatchService();
  const playerService = new PlayerService();
  const lineupService = new MatchLineupService();
  const formationService = new MatchFormationService();

  const match = await matchService.findById(matchId, teamId);
  if (!match) {
    notFound();
  }

  const ref = { matchType: "OFFICIAL" as const, matchId };

  const [playersData, lineupData, formation, isLocked] = await Promise.all([
    playerService.findAll(teamId, access.categories),
    lineupService.findByMatch(teamId, ref),
    formationService.getOrCreate(teamId, ref),
    formationService.isEffectivelyLocked(teamId, ref),
  ]);

  const activePlayers = playersData.filter((p) => p.isActive);
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

  const opponent = match.equipeHome === teamId ? match.awayTeam?.nom : match.homeTeam?.nom;
  const isHome = match.equipeHome === teamId;

  return (
    <PitchLineupEditor
      ref={ref}
      matchLabel={`${isHome ? "Domicile" : "Extérieur"} vs ${opponent ?? "?"}`}
      matchDate={match.date ? match.date.toISOString() : null}
      players={players}
      initialLineup={lineup}
      initialFormation={formation.formation}
      isLocked={isLocked}
      canEdit={can(access, "lineups.edit")}
      canSendConvocations={can(access, "convocations.send")}
      backHref="/admin/matches"
      backLabel="Retour aux matchs"
    />
  );
}
