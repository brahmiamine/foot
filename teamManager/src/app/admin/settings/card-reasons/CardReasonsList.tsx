"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCardReason, updateCardReason, deleteCardReason } from "./actions";

interface ReasonData {
  id: string;
  labelFr: string;
  labelAr: string | null;
  type: "YELLOW" | "RED" | "BOTH";
  isActive: boolean;
}

const TYPE_LABELS: Record<string, string> = { YELLOW: "Jaune", RED: "Rouge", BOTH: "Les deux" };

export function CardReasonsList({ initialReasons }: { initialReasons: ReasonData[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const reasons = initialReasons;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleCreate = async (formData: FormData) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await createCardReason(formData);
      if (result.success) {
        setSuccess(result.message ?? null);
        startTransition(() => router.refresh());
      } else {
        setError(result.error || "Erreur lors de la création");
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (reason: ReasonData) => {
    setLoading(true);
    setError(null);
    const formData = new FormData();
    formData.set("isActive", reason.isActive ? "false" : "true");
    try {
      const result = await updateCardReason(reason.id, formData);
      if (result.success) {
        startTransition(() => router.refresh());
      } else {
        setError(result.error || "Erreur lors de la mise à jour");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce motif ?")) return;
    setLoading(true);
    setError(null);
    try {
      const result = await deleteCardReason(id);
      if (result.success) {
        startTransition(() => router.refresh());
      } else {
        setError(result.error || "Erreur lors de la suppression");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "form-control form-control-sm";

  return (
    <div>
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
        <div className="card-header fw-semibold">Ajouter un motif</div>
        <div className="card-body">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleCreate(formData);
              e.currentTarget.reset();
            }}
            className="row g-2 align-items-end"
          >
            <div className="col-12 col-md">
              <label className="form-label small mb-1">Libellé (FR)</label>
              <input type="text" name="labelFr" className={inputClass} required minLength={2} />
            </div>
            <div className="col-12 col-md">
              <label className="form-label small mb-1">Libellé (AR)</label>
              <input type="text" name="labelAr" className={inputClass} dir="rtl" />
            </div>
            <div className="col-12 col-md-auto">
              <label className="form-label small mb-1">Type</label>
              <select name="type" className="form-select form-select-sm" defaultValue="BOTH">
                <option value="BOTH">Les deux</option>
                <option value="YELLOW">Jaune</option>
                <option value="RED">Rouge</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loading || isPending}
              className="btn btn-primary btn-sm col-12 col-md-auto"
            >
              <i className="fas fa-plus" aria-hidden="true" />
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
        {reasons.length === 0 ? (
          <p className="text-muted text-center py-5 mb-0">Aucun motif enregistré</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Libellé</th>
                  <th>Type</th>
                  <th>Actif</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reasons.map((r) => (
                  <tr key={r.id}>
                    <td>
                      {r.labelFr}
                      {r.labelAr && (
                        <div className="small text-muted" dir="rtl">
                          {r.labelAr}
                        </div>
                      )}
                    </td>
                    <td>{TYPE_LABELS[r.type]}</td>
                    <td>
                      <input
                        type="checkbox"
                        checked={r.isActive}
                        onChange={() => toggleActive(r)}
                        disabled={loading || isPending}
                        className="form-check-input"
                      />
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id)}
                        disabled={loading || isPending}
                        className="btn btn-sm btn-outline-danger"
                      >
                        <i className="fas fa-trash" aria-hidden="true" />
                        <span className="visually-hidden">Supprimer</span>
                      </button>
                    </td>
                  </tr>
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
