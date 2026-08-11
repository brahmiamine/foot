"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useConfirm } from "@/hooks/useConfirm";
import { setTicketingEventStatus, updateTicketingEventSettings, setEventCategoryQuota, removeEventCategory } from "../actions";
import type { TicketingEventStatus } from "@/entities/TicketingEvent";
import type { TicketingEventStats } from "@/services/TicketStatsService";

interface EventCategoryData {
  ticketCategoryId: number;
  name: string;
  color: string | null;
  quota: number;
  soldCount: number;
  isAvailable: boolean;
}

interface CategoryOption {
  id: number;
  name: string;
  color: string | null;
}

const STATUS_LABELS: Record<TicketingEventStatus, string> = {
  DRAFT: "Brouillon",
  SCHEDULED: "Programmée",
  OPEN: "Ouverte",
  CLOSED: "Clôturée",
  CANCELLED: "Annulée",
};

function formatDateTimeForInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TicketingEventDetail({
  event,
  eventCategories,
  availableCategories,
  stats,
  canManageQuotas,
  canUpdate,
}: {
  event: { id: number; matchLabel: string; status: TicketingEventStatus; salesStartAt: string | null; salesEndAt: string | null; maxTicketsPerOrder: number };
  eventCategories: EventCategoryData[];
  availableCategories: CategoryOption[];
  stats: TicketingEventStats;
  canManageQuotas: boolean;
  canUpdate: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { confirm, confirmDialog } = useConfirm();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [addingCategoryId, setAddingCategoryId] = useState<number | "">("");
  const [addingQuota, setAddingQuota] = useState(0);

  const notify = (result: { success: boolean; message?: string; error?: string }) => {
    if (result.success) {
      setError(null);
      setSuccess(result.message ?? null);
      startTransition(() => router.refresh());
    } else {
      setSuccess(null);
      setError(result.error || "Erreur");
    }
  };

  const handleSettingsSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    notify(await updateTicketingEventSettings(event.id, formData));
  };

  const handleQuotaSubmit = async (ticketCategoryId: number, quota: number, isAvailable: boolean) => {
    const formData = new FormData();
    formData.set("ticketCategoryId", String(ticketCategoryId));
    formData.set("quota", String(quota));
    if (isAvailable) formData.set("isAvailable", "on");
    notify(await setEventCategoryQuota(event.id, formData));
  };

  const handleAddCategory = async () => {
    if (!addingCategoryId) return;
    await handleQuotaSubmit(addingCategoryId, addingQuota, true);
    setAddingCategoryId("");
    setAddingQuota(0);
  };

  const handleRemoveCategory = async (ticketCategoryId: number, name: string) => {
    if (!(await confirm(`Retirer la catégorie "${name}" de cette billetterie ?`))) return;
    notify(await removeEventCategory(event.id, ticketCategoryId));
  };

  const handleStatusChange = async (status: TicketingEventStatus) => {
    notify(await setTicketingEventStatus(event.id, status));
  };

  return (
    <div className="container-fluid px-0">
      {confirmDialog}
      <div className="mb-4">
        <Link href="/admin/ticketing" className="text-decoration-none small">
          <i className="fas fa-arrow-left me-1" aria-hidden="true" />
          Retour à la billetterie
        </Link>
        <h1 className="h4 mt-2 mb-1">{event.matchLabel}</h1>
        <span className="badge bg-info-subtle text-info">{STATUS_LABELS[event.status]}</span>
      </div>

      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-start mb-4">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Fermer" className="btn-close" />
        </div>
      )}
      {success && (
        <div className="alert alert-success d-flex justify-content-between align-items-start mb-4">
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess(null)} aria-label="Fermer" className="btn-close" />
        </div>
      )}

      <div className="row g-4">
        <div className="col-lg-4">
          <div className="card mb-4">
            <div className="card-header bg-transparent">
              <h5 className="card-title mb-0">Statistiques</h5>
            </div>
            <div className="card-body">
              <div className="row g-2 text-center mb-3">
                <div className="col-6">
                  <div className="fs-4 fw-bold">{stats.issued}</div>
                  <div className="text-muted small">Émis</div>
                </div>
                <div className="col-6">
                  <div className="fs-4 fw-bold text-success">{stats.used}</div>
                  <div className="text-muted small">Utilisés</div>
                </div>
                <div className="col-6">
                  <div className="fs-4 fw-bold text-primary">{stats.available}</div>
                  <div className="text-muted small">Disponibles</div>
                </div>
                <div className="col-6">
                  <div className="fs-4 fw-bold text-danger">{stats.cancelled}</div>
                  <div className="text-muted small">Annulés</div>
                </div>
              </div>
              <p className="text-muted small mb-0">Taux d&apos;entrée : {stats.entryRatePercent}%</p>
            </div>
          </div>

          <div className="card">
            <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">Statut de la vente</h5>
            </div>
            <div className="card-body d-flex flex-wrap gap-2">
              {event.status === "DRAFT" && (
                <button type="button" className="btn btn-sm btn-outline-info" onClick={() => handleStatusChange("SCHEDULED")}>
                  Programmer
                </button>
              )}
              {(event.status === "DRAFT" || event.status === "SCHEDULED") && (
                <button type="button" className="btn btn-sm btn-success" onClick={() => handleStatusChange("OPEN")}>
                  Ouvrir la vente
                </button>
              )}
              {event.status === "OPEN" && (
                <button type="button" className="btn btn-sm btn-dark" onClick={() => handleStatusChange("CLOSED")}>
                  Clôturer la vente
                </button>
              )}
              {event.status !== "CLOSED" && event.status !== "CANCELLED" && (
                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleStatusChange("CANCELLED")}>
                  Annuler la billetterie
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          {canUpdate && (
            <div className="card mb-4">
              <div className="card-header bg-transparent">
                <h5 className="card-title mb-0">Réglages</h5>
              </div>
              <div className="card-body">
                <form onSubmit={handleSettingsSubmit} className="row g-3">
                  <div className="col-md-4">
                    <label htmlFor="salesStartAt" className="form-label">
                      Début des ventes
                    </label>
                    <input type="datetime-local" id="salesStartAt" name="salesStartAt" className="form-control" defaultValue={formatDateTimeForInput(event.salesStartAt)} />
                  </div>
                  <div className="col-md-4">
                    <label htmlFor="salesEndAt" className="form-label">
                      Fin des ventes
                    </label>
                    <input type="datetime-local" id="salesEndAt" name="salesEndAt" className="form-control" defaultValue={formatDateTimeForInput(event.salesEndAt)} />
                  </div>
                  <div className="col-md-4">
                    <label htmlFor="maxTicketsPerOrder" className="form-label">
                      Max billets / commande
                    </label>
                    <input type="number" id="maxTicketsPerOrder" name="maxTicketsPerOrder" className="form-control" min={1} max={50} defaultValue={event.maxTicketsPerOrder} />
                  </div>
                  <div className="col-12">
                    <button type="submit" className="btn btn-primary btn-sm">
                      Enregistrer
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header bg-transparent">
              <h5 className="card-title mb-0">Catégories & quotas</h5>
            </div>
            <div className="card-body">
              {eventCategories.length === 0 ? (
                <p className="text-muted small">Aucune catégorie configurée pour cette billetterie.</p>
              ) : (
                <div className="table-responsive mb-3">
                  <table className="table table-sm align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Catégorie</th>
                        <th>Quota</th>
                        <th>Vendus</th>
                        <th>Disponible</th>
                        <th>Ouverte</th>
                        {canManageQuotas && <th className="text-end">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {eventCategories.map((ec) => (
                        <tr key={ec.ticketCategoryId}>
                          <td>
                            <span className="d-inline-block rounded me-2" style={{ width: 12, height: 12, backgroundColor: ec.color ?? "#adb5bd" }} />
                            {ec.name}
                          </td>
                          <td style={{ maxWidth: 120 }}>
                            {canManageQuotas ? (
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                min={ec.soldCount}
                                defaultValue={ec.quota}
                                onBlur={(e) => {
                                  const value = parseInt(e.target.value, 10);
                                  if (!Number.isNaN(value) && value !== ec.quota) handleQuotaSubmit(ec.ticketCategoryId, value, ec.isAvailable);
                                }}
                              />
                            ) : (
                              ec.quota
                            )}
                          </td>
                          <td>{ec.soldCount}</td>
                          <td>{Math.max(0, ec.quota - ec.soldCount)}</td>
                          <td>
                            {canManageQuotas ? (
                              <div className="form-check form-switch mb-0">
                                <input className="form-check-input" type="checkbox" checked={ec.isAvailable} onChange={(e) => handleQuotaSubmit(ec.ticketCategoryId, ec.quota, e.target.checked)} />
                              </div>
                            ) : ec.isAvailable ? (
                              "✅"
                            ) : (
                              "—"
                            )}
                          </td>
                          {canManageQuotas && (
                            <td className="text-end">
                              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleRemoveCategory(ec.ticketCategoryId, ec.name)} disabled={ec.soldCount > 0}>
                                <i className="fas fa-trash" aria-hidden="true" />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {canManageQuotas && availableCategories.length > 0 && (
                <div className="row g-2 align-items-end border-top pt-3">
                  <div className="col-md-5">
                    <label className="form-label small mb-1">Ajouter une catégorie</label>
                    <select className="form-select form-select-sm" value={addingCategoryId} onChange={(e) => setAddingCategoryId(e.target.value ? parseInt(e.target.value, 10) : "")}>
                      <option value="">Choisir</option>
                      {availableCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small mb-1">Quota</label>
                    <input type="number" className="form-control form-control-sm" min={0} value={addingQuota} onChange={(e) => setAddingQuota(parseInt(e.target.value, 10) || 0)} />
                  </div>
                  <div className="col-md-3">
                    <button type="button" className="btn btn-sm btn-primary w-100" onClick={handleAddCategory} disabled={!addingCategoryId}>
                      Ajouter
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
