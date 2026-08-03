import { requireTeamId } from "@/lib/team-context";
import { StatsService } from "@/services/StatsService";
import { TeamService } from "@/services/TeamService";

export const dynamic = "force-dynamic";

/** Page Statistiques admin — agrège les données déjà en base (aucune nouvelle table). */
export default async function StatsPage() {
  const teamId = await requireTeamId();
  const statsService = new StatsService();
  const teamService = new TeamService();

  const [stats, team] = await Promise.all([statsService.getStats(teamId), teamService.findById(teamId)]);

  const overview = [
    { label: "Joueurs (actifs)", value: `${stats.activePlayersCount} / ${stats.playersCount}` },
    { label: "Staff", value: stats.staffCount },
    { label: "Matchs joués", value: stats.matchesPlayed },
    { label: "Suspensions actives", value: stats.activeSuspensionsCount },
  ];

  const results = [
    { label: "Victoires", value: stats.wins },
    { label: "Nuls", value: stats.draws },
    { label: "Défaites", value: stats.losses },
  ];

  const discipline = [
    { label: "Cartons jaunes", value: stats.cardsCount.yellow },
    { label: "Cartons rouges", value: stats.cardsCount.red },
    { label: "Double jaunes", value: stats.cardsCount.doubleYellow },
    { label: "Amendes en attente", value: stats.finesPendingCount },
  ];

  const activity = [
    { label: "Produits en boutique", value: stats.productsCount },
    { label: "Sponsors actifs", value: stats.activeSponsorsCount },
    { label: "Total amendes émises", value: `${stats.finesTotalAmount.toFixed(3)} DT` },
  ];

  return (
    <div className="container-fluid px-0">
      <div className="card mb-4">
        <div className="card-body">
          <h2 className="h5 mb-1">Statistiques du club</h2>
          <p className="text-muted mb-0">Vue d&apos;ensemble chiffrée pour {team?.nom ?? "le club"}.</p>
        </div>
      </div>

      <h5 className="text-uppercase small text-muted fw-semibold mb-3">Aperçu</h5>
      <div className="row g-3 mb-4">
        {overview.map((stat) => (
          <div className="col-sm-6 col-xl-3" key={stat.label}>
            <div className="admin-kpi-card h-100">
              <div className="admin-kpi-value">{stat.value}</div>
              <div className="admin-kpi-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <h5 className="text-uppercase small text-muted fw-semibold mb-3">Résultats (matchs terminés)</h5>
      <div className="row g-3 mb-4">
        {results.map((stat) => (
          <div className="col-sm-4" key={stat.label}>
            <div className="admin-kpi-card h-100">
              <div className="admin-kpi-value">{stat.value}</div>
              <div className="admin-kpi-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <h5 className="text-uppercase small text-muted fw-semibold mb-3">Discipline</h5>
      <div className="row g-3 mb-4">
        {discipline.map((stat) => (
          <div className="col-sm-6 col-xl-3" key={stat.label}>
            <div className="admin-kpi-card h-100">
              <div className="admin-kpi-value">{stat.value}</div>
              <div className="admin-kpi-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <h5 className="text-uppercase small text-muted fw-semibold mb-3">Boutique &amp; sponsors</h5>
      <div className="row g-3">
        {activity.map((stat) => (
          <div className="col-sm-6 col-xl-4" key={stat.label}>
            <div className="admin-kpi-card h-100">
              <div className="admin-kpi-value">{stat.value}</div>
              <div className="admin-kpi-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
