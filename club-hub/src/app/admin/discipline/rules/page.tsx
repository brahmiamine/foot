import { getUserAccess, can, requirePermission, selectableCategories } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { getDataSource } from "@/lib/database";
import { Match } from "@/entities/Match";
import { PlayerService } from "@/services/PlayerService";
import { DisciplineRuleService } from "@/services/DisciplineRuleService";
import { AGE_CATEGORIES } from "@/types/categories";
import { DisciplineRulesManager } from "./DisciplineRulesManager";

export const dynamic = "force-dynamic";

interface SeasonScopeRow {
  seasonId: string;
  seasonName: string;
  competitionType: "championnat" | "coupe" | "tournois";
  category: string;
}

export default async function DisciplineRulesPage() {
  const teamId = await requireTeamId();
  const access = await getUserAccess();
  if (access.teamId !== teamId) throw new Error("Contexte club incohérent");
  requirePermission(access, "discipline.view");

  const service = new DisciplineRuleService();
  const dataSource = await getDataSource();
  const [ruleSets, overrides, playersData, matches, seasonScopes] = await Promise.all([
    service.listRuleSets(teamId),
    service.listOverrides(teamId),
    new PlayerService().findAll(teamId, access.categories),
    dataSource.getRepository(Match).find({
      where: [{ equipeHome: teamId }, { equipeAway: teamId }],
      relations: { homeTeam: true, awayTeam: true },
      order: { date: "DESC" },
      take: 100,
    }),
    dataSource.query(
      `SELECT DISTINCT cr.season_id AS seasonId, s.nom AS seasonName,
              s.type_competition AS competitionType, cr.category AS category
         FROM competition_registrations cr
         INNER JOIN saisons s ON s.id = cr.season_id
        WHERE cr.team_id = ?
        ORDER BY s.date_debut DESC, s.nom ASC, cr.category ASC`,
      [teamId],
    ) as Promise<SeasonScopeRow[]>,
  ]);

  const players = playersData
    .filter((player) => player.isActive)
    .map((player) => ({
      id: player.id,
      label: `#${player.number} ${player.firstNameFr} ${player.lastNameFr}`,
      category: player.category,
    }));
  const matchOptions = matches.map((match) => ({
    id: match.id,
    label: `${match.homeTeam?.nom_fr ?? match.equipeHome} — ${match.awayTeam?.nom_fr ?? match.equipeAway}`,
    date: match.date?.toISOString() ?? null,
  }));

  return (
    <DisciplineRulesManager
      rules={ruleSets.map((rule) => ({
        id: rule.id,
        seasonId: rule.seasonId,
        competitionType: rule.competitionType,
        category: rule.category,
        version: rule.version,
        validFrom: rule.validFrom.toISOString(),
        validUntil: rule.validUntil?.toISOString() ?? null,
        yellowWarningThreshold: rule.yellowWarningThreshold,
        yellowSuspensionThreshold: rule.yellowSuspensionThreshold,
        yellowSuspensionMatches: rule.yellowSuspensionMatches,
        yellowFineAmount: Number(rule.yellowFineAmount),
        redFineAmount: Number(rule.redFineAmount),
        fineDueDays: rule.fineDueDays,
        defaultRedSuspensionMatches: rule.defaultRedSuspensionMatches,
        defaultDoubleYellowSuspensionMatches: rule.defaultDoubleYellowSuspensionMatches,
        reason: rule.reason,
      }))}
      overrides={overrides.map((override) => ({
        id: override.id,
        targetType: override.targetType,
        targetId: override.targetId,
        values: override.values,
        validFrom: override.validFrom.toISOString(),
        validUntil: override.validUntil?.toISOString() ?? null,
        reason: override.reason,
        revokedAt: override.revokedAt?.toISOString() ?? null,
        revocationReason: override.revocationReason,
      }))}
      seasonScopes={seasonScopes}
      players={players}
      matches={matchOptions}
      allowedCategories={selectableCategories(access, AGE_CATEGORIES)}
      canManage={can(access, "discipline.manage")}
      canGlobalScope={access.categories === "ALL"}
    />
  );
}
