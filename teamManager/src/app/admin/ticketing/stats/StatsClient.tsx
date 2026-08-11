"use client";

import { useRouter } from "next/navigation";
import type { TicketingEventStats } from "@/services/TicketStatsService";

interface EventOption {
  id: number;
  label: string;
}

export function StatsClient({ events, selectedId, stats }: { events: EventOption[]; selectedId: number | null; stats: TicketingEventStats | null }) {
  const router = useRouter();

  return (
    <div className="container-fluid px-0">
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="h4 mb-1">Statistiques billetterie</h1>
          <p className="text-muted mb-0">Comptages en temps réel — billets émis, utilisés, disponibles.</p>
        </div>
        <select
          className="form-select w-auto"
          value={selectedId ?? ""}
          onChange={(e) => router.push(`/admin/ticketing/stats?event=${e.target.value}`)}
        >
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </div>

      {!stats ? (
        <div className="card">
          <div className="card-body">
            <p className="text-muted mb-0 text-center py-5">Aucune billetterie</p>
          </div>
        </div>
      ) : (
        <>
          <div className="row g-3 mb-4">
            {[
              { label: "Émis", value: stats.issued, className: "text-primary" },
              { label: "Utilisés", value: stats.used, className: "text-success" },
              { label: "Disponibles", value: stats.available, className: "text-info" },
              { label: "Annulés", value: stats.cancelled, className: "text-danger" },
              { label: "Taux d'entrée", value: `${stats.entryRatePercent}%`, className: "text-dark" },
            ].map((card) => (
              <div className="col-6 col-md" key={card.label}>
                <div className="card text-center h-100">
                  <div className="card-body">
                    <div className={`fs-3 fw-bold ${card.className}`}>{card.value}</div>
                    <div className="text-muted small">{card.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="row g-4">
            <div className="col-lg-6">
              <div className="card h-100">
                <div className="card-header bg-transparent">
                  <h5 className="card-title mb-0">Par catégorie</h5>
                </div>
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Catégorie</th>
                        <th>Émis</th>
                        <th>Utilisés</th>
                        <th>Disponibles</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.byCategory.map((c) => (
                        <tr key={c.categoryId}>
                          <td>{c.categoryName}</td>
                          <td>{c.issued}</td>
                          <td>{c.used}</td>
                          <td>{c.available}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="col-lg-6">
              <div className="card h-100">
                <div className="card-header bg-transparent">
                  <h5 className="card-title mb-0">Entrées par porte</h5>
                </div>
                <div className="table-responsive">
                  {stats.byGate.length === 0 ? (
                    <p className="text-muted small p-3 mb-0">Aucune entrée scannée</p>
                  ) : (
                    <table className="table table-sm align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Porte</th>
                          <th>Entrées validées</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.byGate.map((g) => (
                          <tr key={g.gate}>
                            <td>{g.gate}</td>
                            <td>{g.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
