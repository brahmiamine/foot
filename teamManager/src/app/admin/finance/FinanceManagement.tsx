"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/useConfirm";
import { AGE_CATEGORIES, AGE_CATEGORY_LABELS } from "@/types/categories";
import { PAYMENT_METHODS } from "@/types/finance";
import { createFeePlan, deleteFeePlan, assignFee, setFeeWaived, deleteFee, recordPayment, deletePayment } from "./actions";

const STATUS_LABELS: Record<string, string> = { PENDING: "En attente", PARTIAL: "Partiel", PAID: "Payé", WAIVED: "Exonéré" };
const STATUS_BADGES: Record<string, string> = {
  PENDING: "bg-secondary-subtle text-secondary",
  PARTIAL: "bg-warning-subtle text-warning",
  PAID: "bg-success-subtle text-success",
  WAIVED: "bg-info-subtle text-info",
};
const METHOD_LABELS: Record<string, string> = { CASH: "Espèces", TRANSFER: "Virement", CHECK: "Chèque", OTHER: "Autre" };

interface PlanData {
  id: number;
  name: string;
  amount: string;
  seasonName: string | null;
  category: string | null;
  description: string | null;
}

interface PaymentData {
  id: number;
  amount: string;
  method: string;
  paidAt: string;
  notes: string | null;
}

interface FeeData {
  id: number;
  playerId: string;
  playerName: string;
  feePlanName: string | null;
  label: string;
  amountDue: string;
  dueDate: string | null;
  status: string;
  totalPaid: number;
  balance: number;
  payments: PaymentData[];
}

interface Option {
  id: number;
  name: string;
}

interface PlayerOption {
  id: string;
  label: string;
}

export function FinanceManagement({
  initialPlans,
  initialFees,
  seasons,
  players,
  canManage,
}: {
  initialPlans: PlanData[];
  initialFees: FeeData[];
  seasons: Option[];
  players: PlayerOption[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirm, confirmDialog } = useConfirm();

  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showFeeForm, setShowFeeForm] = useState(false);
  const [expandedFeeId, setExpandedFeeId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handlePlanSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await createFeePlan(formData);
    if (result.success) {
      setSuccess(result.message ?? null);
      setShowPlanForm(false);
      (e.target as HTMLFormElement).reset();
      startTransition(() => router.refresh());
    } else {
      setError(result.error || "Erreur");
    }
  };

  const handleDeletePlan = async (plan: PlanData) => {
    if (!(await confirm(`Supprimer le modèle "${plan.name}" ?`))) return;
    const result = await deleteFeePlan(plan.id);
    if (result.success) startTransition(() => router.refresh());
    else setError(result.error || "Erreur");
  };

  const handleFeeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const result = await assignFee(formData);
    if (result.success) {
      setSuccess(result.message ?? null);
      setShowFeeForm(false);
      (e.target as HTMLFormElement).reset();
      startTransition(() => router.refresh());
    } else {
      setError(result.error || "Erreur");
    }
  };

  const handleWaive = async (fee: FeeData) => {
    if (!(await confirm(`Exonérer "${fee.label}" pour ${fee.playerName} ?`))) return;
    const result = await setFeeWaived(fee.id);
    if (result.success) startTransition(() => router.refresh());
    else setError(result.error || "Erreur");
  };

  const handleDeleteFee = async (fee: FeeData) => {
    if (!(await confirm(`Supprimer la cotisation "${fee.label}" de ${fee.playerName} ?`))) return;
    const result = await deleteFee(fee.id);
    if (result.success) startTransition(() => router.refresh());
    else setError(result.error || "Erreur lors de la suppression");
  };

  const handlePaymentSubmit = async (e: React.FormEvent<HTMLFormElement>, feeId: number) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await recordPayment(feeId, formData);
    if (result.success) {
      (e.target as HTMLFormElement).reset();
      startTransition(() => router.refresh());
    } else {
      setError(result.error || "Erreur");
    }
  };

  const handleDeletePayment = async (paymentId: number, feeId: number) => {
    const result = await deletePayment(paymentId, feeId);
    if (result.success) startTransition(() => router.refresh());
    else setError(result.error || "Erreur");
  };

  return (
    <div className="container-fluid px-0">
      {confirmDialog}
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="h4 mb-1">Cotisations & paiements</h1>
          <p className="text-muted mb-0">Cotisations du club (TND), assignées aux joueurs et réglées en un ou plusieurs versements.</p>
        </div>
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

      <div className="card mb-4">
        <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
          <h6 className="card-title mb-0">Modèles de cotisation</h6>
          {canManage && (
            <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => setShowPlanForm((v) => !v)}>
              <i className="fas fa-plus me-1" aria-hidden="true" />
              {showPlanForm ? "Annuler" : "Nouveau modèle"}
            </button>
          )}
        </div>
        {showPlanForm && (
          <div className="card-body border-bottom">
            <form onSubmit={handlePlanSubmit} className="row g-2 align-items-end">
              <div className="col-md-3">
                <label className="form-label small mb-1">Nom</label>
                <input type="text" name="name" className="form-control form-control-sm" required maxLength={150} />
              </div>
              <div className="col-md-2">
                <label className="form-label small mb-1">Montant (TND)</label>
                <input type="number" name="amount" step="0.001" min="0" className="form-control form-control-sm" required />
              </div>
              <div className="col-md-2">
                <label className="form-label small mb-1">Saison</label>
                <select name="seasonId" className="form-select form-select-sm" defaultValue="">
                  <option value="">—</option>
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label small mb-1">Catégorie</label>
                <select name="category" className="form-select form-select-sm" defaultValue="">
                  <option value="">Toutes</option>
                  {AGE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {AGE_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label small mb-1">Description</label>
                <input type="text" name="description" className="form-control form-control-sm" maxLength={500} />
              </div>
              <div className="col-md-1">
                <button type="submit" className="btn btn-sm btn-primary w-100">
                  <i className="fas fa-plus" aria-hidden="true" />
                </button>
              </div>
            </form>
          </div>
        )}
        <div className="card-body">
          {initialPlans.length === 0 ? (
            <p className="text-muted mb-0">Aucun modèle de cotisation.</p>
          ) : (
            <table className="table table-sm mb-0">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Montant</th>
                  <th>Saison</th>
                  <th>Catégorie</th>
                  {canManage && <th></th>}
                </tr>
              </thead>
              <tbody>
                {initialPlans.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{Number(p.amount).toFixed(3)} TND</td>
                    <td>{p.seasonName ?? "—"}</td>
                    <td>{p.category ? AGE_CATEGORY_LABELS[p.category as keyof typeof AGE_CATEGORY_LABELS] : "Toutes"}</td>
                    {canManage && (
                      <td className="text-end">
                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDeletePlan(p)}>
                          <i className="fas fa-trash" aria-hidden="true" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header bg-transparent d-flex justify-content-between align-items-center">
          <h6 className="card-title mb-0">Cotisations des joueurs</h6>
          {canManage && (
            <button type="button" className="btn btn-sm btn-primary" onClick={() => setShowFeeForm((v) => !v)}>
              <i className="fas fa-plus me-1" aria-hidden="true" />
              {showFeeForm ? "Annuler" : "Assigner une cotisation"}
            </button>
          )}
        </div>
        {showFeeForm && (
          <div className="card-body border-bottom">
            <form onSubmit={handleFeeSubmit} className="row g-2 align-items-end">
              <div className="col-md-3">
                <label className="form-label small mb-1">Joueur</label>
                <select name="playerId" className="form-select form-select-sm" required defaultValue="">
                  <option value="" disabled>
                    Choisir
                  </option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label small mb-1">Modèle (optionnel)</label>
                <select name="feePlanId" className="form-select form-select-sm" defaultValue="">
                  <option value="">—</option>
                  {initialPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label small mb-1">Libellé</label>
                <input type="text" name="label" className="form-control form-control-sm" required maxLength={150} defaultValue="Cotisation" />
              </div>
              <div className="col-md-2">
                <label className="form-label small mb-1">Montant dû (TND)</label>
                <input type="number" name="amountDue" step="0.001" min="0" className="form-control form-control-sm" required />
              </div>
              <div className="col-md-1">
                <label className="form-label small mb-1">Échéance</label>
                <input type="date" name="dueDate" className="form-control form-control-sm" />
              </div>
              <div className="col-md-1">
                <button type="submit" className="btn btn-sm btn-primary w-100">
                  <i className="fas fa-plus" aria-hidden="true" />
                </button>
              </div>
            </form>
          </div>
        )}
        <div className="card-body">
          {initialFees.length === 0 ? (
            <p className="text-muted mb-0">Aucune cotisation assignée.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Joueur</th>
                    <th>Libellé</th>
                    <th>Dû</th>
                    <th>Payé</th>
                    <th>Solde</th>
                    <th>Statut</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {initialFees.map((f) => (
                    <Fragment key={f.id}>
                      <tr>
                        <td>{f.playerName}</td>
                        <td>{f.label}</td>
                        <td>{Number(f.amountDue).toFixed(3)}</td>
                        <td>{f.totalPaid.toFixed(3)}</td>
                        <td className={f.balance > 0 ? "text-danger" : ""}>{f.balance.toFixed(3)}</td>
                        <td>
                          <span className={`badge ${STATUS_BADGES[f.status]}`}>{STATUS_LABELS[f.status]}</span>
                        </td>
                        <td className="text-end">
                          <div className="btn-group">
                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setExpandedFeeId((prev) => (prev === f.id ? null : f.id))}>
                              <i className={`fas fa-chevron-${expandedFeeId === f.id ? "up" : "down"}`} aria-hidden="true" />
                            </button>
                            {canManage && f.status !== "WAIVED" && f.status !== "PAID" && (
                              <button type="button" className="btn btn-sm btn-outline-info" onClick={() => handleWaive(f)} title="Exonérer">
                                <i className="fas fa-hand-holding-heart" aria-hidden="true" />
                              </button>
                            )}
                            {canManage && (
                              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteFee(f)} disabled={isPending}>
                                <i className="fas fa-trash" aria-hidden="true" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedFeeId === f.id && (
                        <tr>
                          <td colSpan={7} className="bg-light">
                            {f.payments.length > 0 && (
                              <table className="table table-sm mb-3">
                                <thead>
                                  <tr>
                                    <th>Date</th>
                                    <th>Montant</th>
                                    <th>Méthode</th>
                                    <th>Notes</th>
                                    {canManage && <th></th>}
                                  </tr>
                                </thead>
                                <tbody>
                                  {f.payments.map((pay) => (
                                    <tr key={pay.id}>
                                      <td>{new Date(pay.paidAt).toLocaleDateString("fr-FR")}</td>
                                      <td>{Number(pay.amount).toFixed(3)} TND</td>
                                      <td>{METHOD_LABELS[pay.method]}</td>
                                      <td>{pay.notes ?? "—"}</td>
                                      {canManage && (
                                        <td className="text-end">
                                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleDeletePayment(pay.id, f.id)}>
                                            <i className="fas fa-times" aria-hidden="true" />
                                          </button>
                                        </td>
                                      )}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                            {canManage && f.status !== "WAIVED" && (
                              <form onSubmit={(e) => handlePaymentSubmit(e, f.id)} className="row g-2 align-items-end">
                                <div className="col-md-2">
                                  <label className="form-label small mb-1">Montant</label>
                                  <input type="number" name="amount" step="0.001" min="0" className="form-control form-control-sm" required />
                                </div>
                                <div className="col-md-2">
                                  <label className="form-label small mb-1">Méthode</label>
                                  <select name="method" className="form-select form-select-sm" defaultValue="CASH">
                                    {PAYMENT_METHODS.map((m) => (
                                      <option key={m} value={m}>
                                        {METHOD_LABELS[m]}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="col-md-2">
                                  <label className="form-label small mb-1">Date</label>
                                  <input type="date" name="paidAt" className="form-control form-control-sm" />
                                </div>
                                <div className="col-md-3">
                                  <label className="form-label small mb-1">Notes</label>
                                  <input type="text" name="notes" className="form-control form-control-sm" maxLength={255} />
                                </div>
                                <div className="col-md-1">
                                  <button type="submit" className="btn btn-sm btn-primary w-100">
                                    <i className="fas fa-plus" aria-hidden="true" />
                                  </button>
                                </div>
                              </form>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
