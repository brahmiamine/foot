import { TeamService } from "@/services/TeamService";
import { requireTeamId } from "@/lib/team-context";
import { getDataSource } from "@/lib/database";
import { Card } from "@/entities/Card";
import { Suspension } from "@/entities/Suspension";
import { Fine } from "@/entities/Fine";
import { Player } from "@/entities/Player";
import Link from "next/link";

export const dynamic = "force-dynamic";

/**
 * Admin Dashboard Page — accueil du club + résumé disciplinaire, port de
 * cardManager/app/[locale]/admin/dashboard (stats + alertes).
 */
export default async function AdminDashboardPage() {
  const teamId = await requireTeamId();
  const teamService = new TeamService();
  const team = await teamService.findById(teamId);

  const dataSource = await getDataSource();
  const cardRepo = dataSource.getRepository(Card);
  const suspensionRepo = dataSource.getRepository(Suspension);
  const fineRepo = dataSource.getRepository(Fine);
  const playerRepo = dataSource.getRepository(Player);

  const [yellowCards, redCards, activeSuspensions, pendingFines, fineBlockedPlayers, atRiskRows] = await Promise.all([
    cardRepo.count({ where: { isNeutralized: false, type: "YELLOW", player: { teamId } } }),
    cardRepo
      .createQueryBuilder("card")
      .innerJoin("card.player", "player")
      .where("player.teamId = :teamId", { teamId })
      .andWhere("card.type IN ('RED', 'DOUBLE_YELLOW')")
      .getCount(),
    suspensionRepo.find({ where: { status: "ACTIVE", teamId }, relations: { player: true }, take: 10 }),
    fineRepo.count({ where: [{ teamId, status: "PENDING" }, { teamId, status: "OVERDUE" }] }),
    playerRepo
      .createQueryBuilder("player")
      .innerJoin(Fine, "fine", "fine.playerId = player.id")
      .where("player.teamId = :teamId", { teamId })
      .andWhere("player.isActive = true")
      .andWhere("fine.status = 'OVERDUE'")
      .select(["player.id", "player.firstNameFr", "player.lastNameFr"])
      .distinct(true)
      .getMany(),
    // À risque : 2 jaunes cumulés non-neutralisés, sans suspension liée (un 3e déclenchera l'auto-suspension)
    cardRepo
      .createQueryBuilder("card")
      .innerJoin("card.player", "player")
      .leftJoin(Suspension, "suspension", "suspension.cardId = card.id")
      .where("player.teamId = :teamId", { teamId })
      .andWhere("card.type = 'YELLOW'")
      .andWhere("card.isNeutralized = false")
      .andWhere("suspension.id IS NULL")
      .groupBy("card.playerId")
      .select("card.playerId", "playerId")
      .addSelect("COUNT(*)", "count")
      .having("COUNT(*) = 2")
      .getRawMany<{ playerId: string; count: string }>(),
  ]);

  const atRiskPlayers = await Promise.all(
    atRiskRows.map(async (row) => {
      const player = await playerRepo.findOne({ where: { id: row.playerId } });
      return player ? `${player.firstNameFr} ${player.lastNameFr}` : null;
    })
  ).then((names) => names.filter((n): n is string => !!n));

  return (
    <div>
      <div className="bg-white rounded-lg shadow border border-gray-200 mb-6">
        <div className="p-5">
          <h2 className="text-xl font-semibold text-gray-900">Tableau de bord</h2>
          <p className="text-gray-500 mt-1 mb-0">
            Bienvenue dans l&apos;espace d&apos;administration du club {team?.nom ?? ""}.
          </p>
        </div>
      </div>

      <h5 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Discipline</h5>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Cartons jaunes (actifs)", value: yellowCards },
          { label: "Cartons rouges", value: redCards },
          { label: "Suspensions actives", value: activeSuspensions.length },
          { label: "Amendes en attente/retard", value: pendingFines },
        ].map((stat) => (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4" key={stat.label}>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-gray-500 text-sm">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-200 font-semibold">Alertes</div>
          <div className="p-5">
            {fineBlockedPlayers.length === 0 && atRiskPlayers.length === 0 && activeSuspensions.length === 0 ? (
              <p className="text-gray-500 mb-0">Aucune alerte</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {fineBlockedPlayers.map((p) => (
                  <li key={p.id} className="text-red-600">
                    ⛔ {p.firstNameFr} {p.lastNameFr} — bloqué (amende en retard)
                  </li>
                ))}
                {atRiskPlayers.map((name) => (
                  <li key={name} className="text-amber-600">
                    ⚠️ {name} — 2 jaunes cumulés (à risque)
                  </li>
                ))}
                {activeSuspensions.map((s) => (
                  <li key={s.id} className="text-gray-700">
                    🚫 {s.player?.firstNameFr} {s.player?.lastNameFr} — suspendu ({s.matchesCount - s.matchesPurged} match(s) restant(s))
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-200 font-semibold">Suspensions actives</div>
          <div className="p-5">
            {activeSuspensions.length === 0 ? (
              <p className="text-gray-500 mb-0">Aucune suspension active</p>
            ) : (
              <ul className="space-y-1 text-sm mb-3">
                {activeSuspensions.map((s) => (
                  <li key={s.id} className="text-gray-700">
                    {s.player?.firstNameFr} {s.player?.lastNameFr} — {s.matchesPurged}/{s.matchesCount} match(s) purgé(s)
                  </li>
                ))}
              </ul>
            )}
            <Link href="/admin/suspensions" className="text-sm text-blue-600 hover:underline">
              Voir toutes les suspensions →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
