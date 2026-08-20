"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  addTripExpense,
  approveTripBudget,
  cancelTrip,
  completeTrip,
  markTripDeparted,
  markTripReady,
  recordTripConsent,
  rejectTripBudget,
  removeTripExpense,
  submitTripBudget,
  updateTripGovernanceSettings,
} from "./actions";

type WorkflowStatus = "DRAFT" | "APPROVAL_PENDING" | "APPROVED" | "READY" | "DEPARTED" | "COMPLETED" | "CANCELLED";
type ConsentStatus = "NOT_REQUIRED" | "PENDING" | "GRANTED" | "REFUSED";
type ActionResult = { success: boolean; message?: string; error?: string };

interface ApprovalData {
  id: string;
  approvalMode: "SINGLE_APPROVAL" | "DUAL_APPROVAL";
  requiredApprovals: number;
  collectedApprovals: number;
  estimatedBudget: number;
  threshold: number;
  isMaker: boolean;
}

interface TripData {
  id: number;
  category: string;
  matchLabel: string;
  departureTime: string;
  meetingPoint: string | null;
  workflowStatus: WorkflowStatus;
  estimatedBudget: number | null;
  approvedBudget: number | null;
  actualBudget: number | null;
  cancellationReason: string | null;
  approval: ApprovalData | null;
  participants: Array<{
    id: number;
    label: string;
    participantType: "PLAYER" | "PARENT" | "STAFF";
    consentRequired: boolean;
    consentStatus: ConsentStatus;
    consentNote: string | null;
  }>;
  expenses: Array<{
    id: string;
    label: string;
    amount: number;
    receiptRequired: boolean;
    documentUrl: string | null;
  }>;
  events: Array<{
    id: number;
    transition: string;
    fromStatus: string | null;
    toStatus: string;
    createdAt: string;
  }>;
}

const STATUS_LABELS: Record<WorkflowStatus, string> = {
  DRAFT: "Brouillon",
  APPROVAL_PENDING: "Budget en approbation",
  APPROVED: "Budget approuvé",
  READY: "Prêt",
  DEPARTED: "Parti",
  COMPLETED: "Clôturé",
  CANCELLED: "Annulé",
};

const STATUS_CLASS: Record<WorkflowStatus, string> = {
  DRAFT: "text-bg-secondary",
  APPROVAL_PENDING: "text-bg-warning",
  APPROVED: "text-bg-info",
  READY: "text-bg-primary",
  DEPARTED: "text-bg-dark",
  COMPLETED: "text-bg-success",
  CANCELLED: "text-bg-danger",
};

const CONSENT_LABELS: Record<ConsentStatus, string> = {
  NOT_REQUIRED: "Non requis",
  PENDING: "En attente",
  GRANTED: "Accordé",
  REFUSED: "Refusé",
};

function money(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value);
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function TripGovernanceManagement({
  initialTrips,
  settings,
  canManage,
  canApprove,
}: {
  initialTrips: TripData[];
  settings: { dualApprovalThreshold: number; receiptRequiredThreshold: number; version: number };
  canManage: boolean;
  canApprove: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "danger"; text: string } | null>(null);

  function run(action: Promise<ActionResult>) {
    startTransition(() => {
      void action.then((result) => {
        if (!result.success) {
          setFeedback({ type: "danger", text: result.error ?? "Action impossible" });
          return;
        }
        setFeedback({ type: "success", text: result.message ?? "Action enregistrée" });
        router.refresh();
      });
    });
  }

  function submit(event: FormEvent<HTMLFormElement>, action: (formData: FormData) => Promise<ActionResult>) {
    event.preventDefault();
    run(action(new FormData(event.currentTarget)));
  }

  return (
    <div className="d-grid gap-4">
      {feedback && <div className={`alert alert-${feedback.type} mb-0`}>{feedback.text}</div>}

      <section className="card border-0 shadow-sm">
        <div className="card-body">
          <div className="d-flex flex-wrap justify-content-between gap-3 align-items-start">
            <div>
              <h2 className="h5 mb-1">Seuils de gouvernance</h2>
              <p className="text-muted small mb-0">
                Version {settings.version || "initiale"}. Un seuil à 0 applique le mode fail-safe.
              </p>
            </div>
            <div className="small text-muted text-end">
              <div>Double validation : {money(settings.dualApprovalThreshold)}</div>
              <div>Justificatif : {money(settings.receiptRequiredThreshold)}</div>
            </div>
          </div>
          {canApprove && (
            <form className="row g-2 mt-2" onSubmit={(event) => submit(event, updateTripGovernanceSettings)}>
              <div className="col-md-4">
                <label className="form-label" htmlFor="trip-dual-threshold">Seuil double approbation</label>
                <input id="trip-dual-threshold" name="dualApprovalThreshold" type="number" min="0" step="0.001" defaultValue={settings.dualApprovalThreshold} className="form-control" required />
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor="trip-receipt-threshold">Seuil justificatif</label>
                <input id="trip-receipt-threshold" name="receiptRequiredThreshold" type="number" min="0" step="0.001" defaultValue={settings.receiptRequiredThreshold} className="form-control" required />
              </div>
              <div className="col-md-4 d-flex align-items-end">
                <button className="btn btn-primary w-100" disabled={isPending}>Enregistrer les seuils</button>
              </div>
            </form>
          )}
        </div>
      </section>

      {initialTrips.length === 0 && <div className="alert alert-light border mb-0">Aucun déplacement dans votre périmètre.</div>}

      {initialTrips.map((trip) => {
        const cancellable = ["DRAFT", "APPROVAL_PENDING", "APPROVED", "READY"].includes(trip.workflowStatus);
        const canRecordExpense = ["APPROVED", "READY", "DEPARTED"].includes(trip.workflowStatus);
        const requiredConsents = trip.participants.filter((participant) => participant.consentRequired);
        const missingConsents = requiredConsents.filter((participant) => participant.consentStatus !== "GRANTED").length;

        return (
          <section className="card border-0 shadow-sm" key={trip.id}>
            <div className="card-header bg-body d-flex flex-wrap justify-content-between align-items-start gap-2 py-3">
              <div>
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <h2 className="h5 mb-0">{trip.matchLabel}</h2>
                  <span className={`badge ${STATUS_CLASS[trip.workflowStatus]}`}>{STATUS_LABELS[trip.workflowStatus]}</span>
                  <span className="badge text-bg-light border">{trip.category.toUpperCase()}</span>
                </div>
                <div className="text-muted small mt-1">
                  Départ {dateTime(trip.departureTime)}{trip.meetingPoint ? ` · ${trip.meetingPoint}` : ""}
                </div>
              </div>
              <div className="text-end small">
                <div>Prévision : <strong>{money(trip.estimatedBudget)}</strong></div>
                <div>Approuvé : <strong>{money(trip.approvedBudget)}</strong></div>
                {trip.workflowStatus === "COMPLETED" && <div>Réel : <strong>{money(trip.actualBudget)}</strong></div>}
              </div>
            </div>

            <div className="card-body d-grid gap-4">
              {trip.workflowStatus === "DRAFT" && canManage && (
                <div>
                  <h3 className="h6">Soumettre le budget</h3>
                  <form className="row g-2" onSubmit={(event) => submit(event, (data) => submitTripBudget(trip.id, data))}>
                    <div className="col-md-5">
                      <label className="form-label" htmlFor={`budget-${trip.id}`}>Budget estimé</label>
                      <input id={`budget-${trip.id}`} name="estimatedBudget" type="number" min="0" step="0.001" defaultValue={trip.estimatedBudget ?? 0} className="form-control" required />
                    </div>
                    <div className="col-md-4 d-flex align-items-end">
                      <button className="btn btn-primary w-100" disabled={isPending}>Soumettre à approbation</button>
                    </div>
                  </form>
                </div>
              )}

              {trip.workflowStatus === "APPROVAL_PENDING" && trip.approval && (
                <div className="border rounded p-3">
                  <div className="d-flex flex-wrap justify-content-between gap-2">
                    <div>
                      <h3 className="h6 mb-1">Approbation financière</h3>
                      <div className="text-muted small">
                        {trip.approval.approvalMode === "DUAL_APPROVAL" ? "Double approbation" : "Approbation simple"} · seuil figé {money(trip.approval.threshold)}
                      </div>
                    </div>
                    <span className="badge text-bg-warning align-self-start">
                      {trip.approval.collectedApprovals}/{trip.approval.requiredApprovals}
                    </span>
                  </div>
                  {canApprove && (
                    <div className="mt-3 d-flex flex-wrap gap-2 align-items-start">
                      <button
                        type="button"
                        className="btn btn-success"
                        disabled={isPending || trip.approval.isMaker}
                        title={trip.approval.isMaker ? "Le maker ne peut pas approuver sa propre soumission" : undefined}
                        onClick={() => run(approveTripBudget(trip.approval!.id))}
                      >
                        Approuver
                      </button>
                      <form className="d-flex flex-wrap gap-2" onSubmit={(event) => submit(event, (data) => rejectTripBudget(trip.approval!.id, data))}>
                        <input name="reason" className="form-control" minLength={3} maxLength={2000} placeholder="Motif de rejet" required disabled={trip.approval.isMaker} />
                        <button className="btn btn-outline-danger" disabled={isPending || trip.approval.isMaker}>Rejeter</button>
                      </form>
                      {trip.approval.isMaker && <span className="text-muted small align-self-center">Vous avez soumis ce budget : maker/checker interdit votre décision.</span>}
                    </div>
                  )}
                </div>
              )}

              {["APPROVED", "READY", "DEPARTED", "COMPLETED"].includes(trip.workflowStatus) && (
                <div>
                  <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                    <h3 className="h6 mb-0">Consentements</h3>
                    <span className={`badge ${missingConsents === 0 ? "text-bg-success" : "text-bg-warning"}`}>
                      {requiredConsents.length - missingConsents}/{requiredConsents.length} requis accordés
                    </span>
                  </div>
                  {requiredConsents.length === 0 ? (
                    <p className="text-muted small mb-0">Aucun consentement mineur requis pour les participants actuels.</p>
                  ) : (
                    <div className="d-grid gap-2">
                      {requiredConsents.map((participant) => (
                        <div className="border rounded p-2" key={participant.id}>
                          <div className="d-flex flex-wrap justify-content-between gap-2 align-items-center">
                            <div>
                              <strong>{participant.label}</strong>
                              <div className="small text-muted">Consentement : {CONSENT_LABELS[participant.consentStatus]}</div>
                              {participant.consentNote && <div className="small mt-1">{participant.consentNote}</div>}
                            </div>
                            {trip.workflowStatus === "APPROVED" && canManage && (
                              <div className="d-flex flex-wrap gap-2">
                                <form className="d-flex gap-2" onSubmit={(event) => submit(event, (data) => recordTripConsent(trip.id, participant.id, data))}>
                                  <input type="hidden" name="granted" value="true" />
                                  <input name="note" className="form-control form-control-sm" maxLength={2000} placeholder="Référence / note" />
                                  <button className="btn btn-sm btn-success" disabled={isPending}>Accorder</button>
                                </form>
                                <form onSubmit={(event) => submit(event, (data) => recordTripConsent(trip.id, participant.id, data))}>
                                  <input type="hidden" name="granted" value="false" />
                                  <input type="hidden" name="note" value="Refus enregistré" />
                                  <button className="btn btn-sm btn-outline-danger" disabled={isPending}>Refuser</button>
                                </form>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {["APPROVED", "READY", "DEPARTED", "COMPLETED"].includes(trip.workflowStatus) && (
                <div>
                  <h3 className="h6">Dépenses et justificatifs</h3>
                  {trip.expenses.length > 0 ? (
                    <div className="table-responsive mb-3">
                      <table className="table table-sm align-middle mb-0">
                        <thead><tr><th>Libellé</th><th className="text-end">Montant</th><th>Justificatif</th>{canManage && canRecordExpense && <th />}</tr></thead>
                        <tbody>
                          {trip.expenses.map((expense) => (
                            <tr key={expense.id}>
                              <td>{expense.label}</td>
                              <td className="text-end">{money(expense.amount)}</td>
                              <td>
                                {expense.documentUrl ? (
                                  <a href={expense.documentUrl} target="_blank" rel="noreferrer">Voir</a>
                                ) : expense.receiptRequired ? (
                                  <span className="text-danger">Manquant</span>
                                ) : (
                                  <span className="text-muted">Non requis</span>
                                )}
                              </td>
                              {canManage && canRecordExpense && (
                                <td className="text-end">
                                  <button className="btn btn-sm btn-outline-danger" type="button" disabled={isPending} onClick={() => run(removeTripExpense(trip.id, expense.id))}>Retirer</button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <p className="text-muted small">Aucune dépense enregistrée.</p>}

                  {canManage && canRecordExpense && (
                    <form className="row g-2" onSubmit={(event) => submit(event, (data) => addTripExpense(trip.id, data))}>
                      <div className="col-md-4"><input name="label" className="form-control" maxLength={150} placeholder="Libellé" required /></div>
                      <div className="col-md-3"><input name="amount" type="number" min="0.001" step="0.001" className="form-control" placeholder="Montant" required /></div>
                      <div className="col-md-3"><input name="documentUrl" className="form-control" maxLength={255} placeholder="https://… ou /uploads/trips/…" /></div>
                      <div className="col-md-2"><button className="btn btn-outline-primary w-100" disabled={isPending}>Ajouter</button></div>
                    </form>
                  )}
                </div>
              )}

              {canManage && trip.workflowStatus === "APPROVED" && (
                <button className="btn btn-primary align-self-start" type="button" disabled={isPending || missingConsents > 0} onClick={() => run(markTripReady(trip.id))}>
                  Passer READY{missingConsents > 0 ? ` (${missingConsents} consentement(s) manquant(s))` : ""}
                </button>
              )}
              {canManage && trip.workflowStatus === "READY" && (
                <button className="btn btn-dark align-self-start" type="button" disabled={isPending} onClick={() => run(markTripDeparted(trip.id))}>Enregistrer le départ</button>
              )}
              {canManage && trip.workflowStatus === "DEPARTED" && (
                <button className="btn btn-success align-self-start" type="button" disabled={isPending} onClick={() => run(completeTrip(trip.id))}>Clôturer et calculer le budget réel</button>
              )}

              {trip.workflowStatus === "CANCELLED" && trip.cancellationReason && (
                <div className="alert alert-danger mb-0">Motif d’annulation : {trip.cancellationReason}</div>
              )}

              {canManage && cancellable && (
                <details>
                  <summary className="text-danger small">Annuler ce déplacement</summary>
                  <form className="d-flex flex-wrap gap-2 mt-2" onSubmit={(event) => submit(event, (data) => cancelTrip(trip.id, data))}>
                    <input name="reason" minLength={3} maxLength={2000} className="form-control" style={{ maxWidth: 520 }} placeholder="Motif obligatoire" required />
                    <button className="btn btn-outline-danger" disabled={isPending}>Annuler</button>
                  </form>
                </details>
              )}

              {trip.events.length > 0 && (
                <details>
                  <summary className="small text-muted">Historique de gouvernance ({trip.events.length} derniers événements)</summary>
                  <ul className="list-group list-group-flush mt-2">
                    {trip.events.map((event) => (
                      <li className="list-group-item px-0 py-2 small" key={event.id}>
                        <strong>{event.transition}</strong> · {event.fromStatus ?? "—"} → {event.toStatus}
                        <span className="text-muted"> · {dateTime(event.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
