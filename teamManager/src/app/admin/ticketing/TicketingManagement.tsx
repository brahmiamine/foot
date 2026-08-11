"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useConfirm } from "@/hooks/useConfirm";
import { createTicketingEvent, setTicketingEventStatus, deleteTicketingEvent } from "./actions";
import type { TicketingEventStatus } from "@/entities/TicketingEvent";

interface EventData {
  id: number;
  matchLabel: string;
  status: TicketingEventStatus;
  salesStartAt: string | null;
  salesEndAt: string | null;
  maxTicketsPerOrder: number;
  totalQuota: number;
  totalSold: number;
}

interface MatchOption {
  value: string;
  label: string;
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

const STATUS_BADGE: Record<TicketingEventStatus, string> = {
  DRAFT: "bg-secondary-subtle text-secondary",
  SCHEDULED: "bg-info-subtle text-info",
  OPEN: "bg-success-subtle text-success",
  CLOSED: "bg-dark-subtle text-dark",
  CANCELLED: "bg-danger-subtle text-danger",
};

export function TicketingManagement({
  initialEvents,
  matchOptions,
  categories,
  canCreate,
  canOpen,
  canClose,
  canCancel,
  canUpdate,
}: {
  initialEvents: EventData[];
  matchOptions: MatchOption[];
  categories: CategoryOption[];
  canCreate: boolean;
  canOpen: boolean;
  canClose: boolean;
  canCancel: boolean;
  canUpdate: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const { confirm, confirmDialog } = useConfirm();

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Record<number, number>>({});

  const toggleCategory = (id: number, checked: boolean) => {
    setSelectedCategories((prev) => {
      const next = { ...prev };
      if (checked) next[id] = next[id] ?? 0;
      else delete next[id];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const formData = new FormData(e.currentTarget);
      formData.set("categoriesJson", JSON.stringify(Object.entries(selectedCategories).map(([ticketCategoryId, quota]) => ({ ticketCategoryId: parseInt(ticketCategoryId, 10), quota }))));
      const result = await createTicketingEvent(formData);
      if (result.success) {
        setShowForm(false);
        setSelectedCategories({});
        startTransition(() => router.refresh());
      } else {
        setError(result.error || "Erreur");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (event: EventData, status: TicketingEventStatus) => {
    const messages: Partial<Record<TicketingEventStatus, string>> = {
      OPEN: `Ouvrir la vente pour "${event.matchLabel}" ?`,
      CLOSED: `Clôturer la vente pour "${event.matchLabel}" ?`,
      CANCELLED: `Annuler la billetterie "${event.matchLabel}" ? Cette action est irréversible.`,
    };
    if (messages[status] && !(await confirm(messages[status]!, { variant: status === "CANCELLED" ? "danger" : "primary" }))) return;
    const result = await setTicketingEventStatus(event.id, status);
    if (result.success) {
      startTransition(() => router.refresh());
    } else {
      setError(result.error || "Erreur");
    }
  };

  const handleDelete = async (event: EventData) => {
    if (!(await confirm(`Supprimer le brouillon "${event.matchLabel}" ?`))) return;
    const result = await deleteTicketingEvent(event.id);
    if (result.success) {
      startTransition(() => router.refresh());
    } else {
      setError(result.error || "Erreur lors de la suppression");
    }
  };

  return (
    <div className="container-fluid px-0">
      {confirmDialog}
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="h4 mb-1">Billetterie</h1>
          <p className="text-muted mb-0">Une billetterie par match : catégories, quotas, ouverture/clôture de la vente.</p>
        </div>
        {canCreate && (
          <button type="button" className="btn btn-primary" onClick={() => setShowForm((v) => !v)}>
            <i className="fas fa-plus me-2" aria-hidden="true" />
            Nouvelle billetterie
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-start mb-4">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Fermer" className="btn-close" />
        </div>
      )}

      {showForm && (
        <div className="card border border-primary mb-4">
          <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
            <h5 className="card-title mb-0 text-primary">Nouvelle billetterie</h5>
            <button type="button" onClick={() => setShowForm(false)} className="btn-close" aria-label="Fermer" />
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="row g-3">
              <div className="col-md-6">
                <label htmlFor="matchRef" className="form-label">
                  Match <span className="text-danger">*</span>
                </label>
                <select id="matchRef" name="matchRef" className="form-select" required defaultValue="">
                  <option value="" disabled>
                    Choisir un match
                  </option>
                  {matchOptions.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label htmlFor="maxTicketsPerOrder" className="form-label">
                  Max billets / commande
                </label>
                <input type="number" id="maxTicketsPerOrder" name="maxTicketsPerOrder" className="form-control" min={1} max={50} defaultValue={5} />
              </div>
              <div className="col-md-2">
                <label htmlFor="salesStartAt" className="form-label">
                  Début des ventes
                </label>
                <input type="datetime-local" id="salesStartAt" name="salesStartAt" className="form-control" />
              </div>
              <div className="col-md-2">
                <label htmlFor="salesEndAt" className="form-label">
                  Fin des ventes
                </label>
                <input type="datetime-local" id="salesEndAt" name="salesEndAt" className="form-control" />
              </div>

              <div className="col-12">
                <label className="form-label">Catégories et quotas</label>
                {categories.length === 0 ? (
                  <p className="text-muted small">
                    Aucune catégorie active. <Link href="/admin/ticketing/categories">Créez-en une d&apos;abord</Link>.
                  </p>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {categories.map((c) => (
                      <div key={c.id} className="row g-2 align-items-center border rounded p-2 mx-0">
                        <div className="col-auto">
                          <div className="form-check mb-0">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              id={`cat-${c.id}`}
                              checked={c.id in selectedCategories}
                              onChange={(e) => toggleCategory(c.id, e.target.checked)}
                            />
                          </div>
                        </div>
                        <div className="col-md-4">
                          <label htmlFor={`cat-${c.id}`} className="form-check-label d-flex align-items-center gap-2">
                            <span className="d-inline-block rounded" style={{ width: 14, height: 14, backgroundColor: c.color ?? "#adb5bd" }} />
                            {c.name}
                          </label>
                        </div>
                        <div className="col-md-3">
                          <div className="input-group input-group-sm">
                            <input
                              type="number"
                              className="form-control"
                              min={0}
                              disabled={!(c.id in selectedCategories)}
                              value={selectedCategories[c.id] ?? 0}
                              onChange={(e) => setSelectedCategories((prev) => ({ ...prev, [c.id]: parseInt(e.target.value, 10) || 0 }))}
                            />
                            <span className="input-group-text">quota</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="col-12">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" /> : null}
                  Créer la billetterie
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {initialEvents.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <p className="text-muted mb-0 text-center py-5">Aucune billetterie créée</p>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th>Match</th>
                  <th>Statut</th>
                  <th>Ventes</th>
                  <th>Billets</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {initialEvents.map((event) => (
                  <tr key={event.id}>
                    <td>
                      <Link href={`/admin/ticketing/${event.id}`} className="fw-semibold text-decoration-none">
                        {event.matchLabel}
                      </Link>
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[event.status]}`}>{STATUS_LABELS[event.status]}</span>
                    </td>
                    <td className="text-muted small">
                      {event.salesStartAt ? new Date(event.salesStartAt).toLocaleString("fr-FR") : "—"}
                      {" → "}
                      {event.salesEndAt ? new Date(event.salesEndAt).toLocaleString("fr-FR") : "—"}
                    </td>
                    <td>
                      {event.totalSold} / {event.totalQuota}
                    </td>
                    <td className="text-end">
                      <div className="d-flex justify-content-end gap-1 flex-wrap">
                        <Link href={`/admin/ticketing/${event.id}`} className="btn btn-sm btn-outline-secondary">
                          <i className="fas fa-cog" aria-hidden="true" />
                        </Link>
                        {canUpdate && event.status === "DRAFT" && (
                          <button type="button" className="btn btn-sm btn-outline-info" onClick={() => handleStatusChange(event, "SCHEDULED")}>
                            Programmer
                          </button>
                        )}
                        {canOpen && (event.status === "DRAFT" || event.status === "SCHEDULED") && (
                          <button type="button" className="btn btn-sm btn-outline-success" onClick={() => handleStatusChange(event, "OPEN")}>
                            Ouvrir
                          </button>
                        )}
                        {canClose && event.status === "OPEN" && (
                          <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => handleStatusChange(event, "CLOSED")}>
                            Clôturer
                          </button>
                        )}
                        {canCancel && event.status !== "CLOSED" && event.status !== "CANCELLED" && (
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleStatusChange(event, "CANCELLED")}>
                            Annuler
                          </button>
                        )}
                        {canUpdate && event.status === "DRAFT" && (
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(event)}>
                            <i className="fas fa-trash" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
