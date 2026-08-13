import { notFound } from "next/navigation";
import { MatchService } from "@/services/MatchService";
import { SheetService } from "@/services/SheetService";
import { LineupService } from "@/services/LineupService";
import { CardReasonService } from "@/services/CardReasonService";
import { CardEventService } from "@/services/CardEventService";
import { GoalService } from "@/services/GoalService";
import { InjuryService } from "@/services/InjuryService";
import { SubstitutionService } from "@/services/SubstitutionService";
import { LiveMatchSheet } from "./LiveMatchSheet";

export const dynamic = "force-dynamic";

function playerName(player?: { firstNameFr: string; lastNameFr: string } | null): string | null {
  if (!player) return null;
  return `${player.firstNameFr} ${player.lastNameFr}`;
}

export default async function LiveMatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;

  const matchService = new MatchService();
  const match = await matchService.findById(matchId);
  if (!match) {
    notFound();
  }

  const sheetService = new SheetService();
  const sheet = await sheetService.getOrCreate(matchId);

  const lineupService = new LineupService();
  const cardReasonService = new CardReasonService();
  const cardEventService = new CardEventService();
  const goalService = new GoalService();
  const injuryService = new InjuryService();
  const substitutionService = new SubstitutionService();

  const [lineup, cardReasons, cards, goals, injuries, substitutions] = await Promise.all([
    lineupService.findByMatch(matchId),
    cardReasonService.findActive(),
    cardEventService.findByMatch(matchId),
    goalService.findBySheet(sheet.id),
    injuryService.findBySheet(sheet.id),
    substitutionService.findBySheet(sheet.id),
  ]);

  const homeLineup = lineup
    .filter((l) => l.teamId === match.equipeHome)
    .map((l) => ({
      matchLineupId: l.id,
      playerId: l.playerId,
      name: playerName(l.player) ?? "Joueur inconnu",
      shirtNumber: l.shirtNumber ?? null,
      role: l.role,
      isCaptain: l.isCaptain,
      teamId: l.teamId,
    }));

  const awayLineup = lineup
    .filter((l) => l.teamId === match.equipeAway)
    .map((l) => ({
      matchLineupId: l.id,
      playerId: l.playerId,
      name: playerName(l.player) ?? "Joueur inconnu",
      shirtNumber: l.shirtNumber ?? null,
      role: l.role,
      isCaptain: l.isCaptain,
      teamId: l.teamId,
    }));

  const cardReasonOptions = cardReasons.map((r) => ({ id: r.id, labelFr: r.labelFr, type: r.type }));

  const cardData = cards.map((c) => ({
    id: c.id,
    playerId: c.playerId,
    playerName: playerName(c.player) ?? "Joueur inconnu",
    type: c.type,
    minute: c.minute ?? null,
    period: c.period ?? null,
    cardReasonId: c.cardReasonId ?? null,
    cardReasonLabel: c.cardReason?.labelFr ?? null,
    commentFr: c.commentFr ?? null,
  }));

  const goalData = goals.map((g) => ({
    id: g.id,
    teamId: g.teamId,
    playerId: g.playerId ?? null,
    playerName: playerName(g.player),
    minute: g.minute,
    period: g.period,
    isOwnGoal: g.isOwnGoal,
    isPenalty: g.isPenalty,
  }));

  const injuryData = injuries.map((i) => ({
    id: i.id,
    teamId: i.teamId,
    playerId: i.playerId ?? null,
    playerName: playerName(i.player),
    minute: i.minute ?? null,
    period: i.period ?? null,
    description: i.description ?? null,
    requiresSubstitution: i.requiresSubstitution,
  }));

  const substitutionData = substitutions.map((s) => ({
    id: s.id,
    teamId: s.teamId,
    playerOutId: s.playerOutId,
    playerOutName: playerName(s.playerOut) ?? "Joueur inconnu",
    playerInId: s.playerInId,
    playerInName: playerName(s.playerIn) ?? "Joueur inconnu",
    minute: s.minute,
    period: s.period,
  }));

  return (
    <LiveMatchSheet
      matchId={matchId}
      homeTeam={{ id: match.equipeHome, name: match.homeTeam?.nom ?? "Équipe domicile" }}
      awayTeam={{ id: match.equipeAway, name: match.awayTeam?.nom ?? "Équipe extérieure" }}
      sheetId={sheet.id}
      sheetStatus={sheet.status}
      sheetVersion={sheet.version}
      homeLineup={homeLineup}
      awayLineup={awayLineup}
      cardReasons={cardReasonOptions}
      cards={cardData}
      goals={goalData}
      injuries={injuryData}
      substitutions={substitutionData}
    />
  );
}
