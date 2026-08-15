import { TeamService } from "@/services/TeamService";
import { requireTeamId } from "@/lib/team-context";
import { getDataSource } from "@/lib/database";
import { Card } from "@/entities/Card";
import { Suspension } from "@/entities/Suspension";
import { Fine } from "@/entities/Fine";
import { Player } from "@/entities/Player";
import Link from "next/link";

export const dynamic = "force-dynamic";

/** Admin Dashboard Page — accueil du club + résumé disciplinaire. */
export default async function AdminDashboardPage() {
  const teamId = await requireTeamId();
  const teamService = new TeamService();
  const team = await teamService.findById(teamId);

  const dataSource = await getDataSource();
  const cardRepo = dataSource.getRepository(Card);
  const suspensionRepo = dataSource.getRepository(Suspension);
  const fineRepo = dataSource.getRepository(Fine);
  const playerRepo = dataSource.getRepository(Player);

  const [yellowCards, redCards, activeSuspensions, pendingFines, fineBlockedPlayers, atRiskPlayers] =
    await Promise.all([
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
      cardRepo
        .createQueryBuilder("card")
        .innerJoin("card.player", "player")
        .leftJoin(Suspension, "suspension", "suspension.cardId = card.id")
        .where("player.teamId = :teamId", { teamId })
        .andWhere("card.type = 'YELLOW'")
        .andWhere("card.isNeutralized = false")
        .andWhere("suspension.id IS NULL")
        .groupBy("player.id")
        .addGroupBy("player.firstNameFr")
        .addGroupBy("player.lastNameFr")
        .select("player.id", "playerId")
        .addSelect("player.firstNameFr", "firstNameFr")
        .addSelect("player.lastNameFr", "lastNameFr")
        .addSelect("COUNT(*)", "count")
        .having("COUNT(*) = 2")
        .getRawMany<{ playerId: string; firstNameFr: string; lastNameFr: string; count: string }>(),
    ]);

  return (
    <div className="container-fluid px-0">
      <div className="card mb-4">
        <div className="card-body">
          <h2 className="h5 mb-1">Tableau de bord</h2>
          <p className="text-muted mb-0">
            Bienvenue dans l&apos;espace d&apos;administration du club {team?.nom ?? ""}.
          </p>
        </div>
      </div>

      <h5 className="text-uppercase small text-muted fw-semibold mb-3">Discipline</h5>
      <div className="row g-3 mb-4">
        {[
          { label: "Cartons jaunes (actifs)", value: yellowCards },
          { label: "Cartons rouges", value: redCards },
          { label: "Suspensions actives", value: activeSuspensions.length },
          { label: "Amendes en attente/retard", value: pendingFines },
        ].map((stat) => (
          <div className="col-sm-6 col-xl-3" key={stat.label}>
            <div className="admin-kpi-card h-100">
              <div className="admin-kpi-value">{stat.value}</div>
              <div className="admin-kpi-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-6">
          <div className="card h-100">
            <div className="card-header fw-semibold">Alertes</div>
            <div className="card-body">
              {fineBlockedPlayers.length === 0 && atRiskPlayers.length === 0 && activeSuspensions.length === 0 ? (
                <p className="text-muted mb-0">Aucune alerte</p>
              ) : (
                <ul className="admin-alert-list">
                  {fineBlockedPlayers.map((player) => (
                    <li key={player.id} className="text-danger small">
                      ⛔ {player.firstNameFr} {player.lastNameFr} — bloqué (amende en retard)
                    </li>
                  ))}
                  {atRiskPlayers.map((player) => (
                    <li key={player.playerId} className="text-warning small">
                      ⚠️ {player.firstNameFr} {player.lastNameFr} — 2 jaunes cumulés (à risque)
                    </li>
                  ))}
                  {activeSuspensions.map((suspension) => (
                    <li key={suspension.id} className="text-body-secondary small">
                      🚫 {suspension.player?.firstNameFr} {suspension.player?.lastNameFr} — suspendu (
                      {suspension.matchesCount - suspension.matchesPurged} match(s) restant(s))
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        <div className="col-12 col-xl-6">
          <div className="card h-100">
            <div className="card-header fw-semibold">Suspensions actives</div>
            <div className="card-body">
              {activeSuspensions.length === 0 ? (
                <p className="text-muted mb-0">Aucune suspension active</p>
              ) : (
                <ul className="admin-alert-list mb-3">
                  {activeSuspensions.map((suspension) => (
                    <li key={suspension.id} className="text-body-secondary small">
                      {suspension.player?.firstNameFr} {suspension.player?.lastNameFr} — {suspension.matchesPurged}/
                      {suspension.matchesCount} match(s) purgé(s)
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/admin/suspensions" className="btn btn-sm btn-primary">
                Voir toutes les suspensions →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
