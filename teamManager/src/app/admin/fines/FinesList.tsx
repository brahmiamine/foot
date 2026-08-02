"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { updateFine, deleteFine } from "./actions";

interface FineData {
  id: string;
  type: string;
  amount: number;
  reasonFr: string;
  status: "PENDING" | "PAID" | "OVERDUE";
  dueDate: string | null;
  paidAt: string | null;
  directorNameFr: string | null;
  player: { firstNameFr: string; lastNameFr: string } | null;
}

const TYPE_LABELS: Record<string, string> = {
  CARD: "Carton",
  VIRAGE: "Virage",
  DIRECTOR: "Dirigeant",
  DISCIPLINARY: "Disciplinaire",
};

const STATUS_BADGES: Record<string, string> = {
  PENDING: "bg-warning-subtle text-warning",
  PAID: "bg-success-subtle text-success",
  OVERDUE: "bg-danger-subtle text-danger",
};

const TABS: { label: string; value?: string }[] = [
  { label: "Toutes", value: undefined },
  { label: "Cartons", value: "CARD" },
  { label: "Virage", value: "VIRAGE" },
  { label: "Dirigeants", value: "DIRECTOR" },
  { label: "Disciplinaire", value: "DISCIPLINARY" },
];

export function FinesList({ initialFines, activeType }: { initialFines: FineData[]; activeType?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fines = initialFines;
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const markPaid = async (id: string) => {
    setLoading(id);
    setError(null);
    setSuccess(null);
    const formData = new FormData();
    formData.set("status", "PAID");
    formData.set("paidAt", new Date().toISOString());
    try {
      const result = await updateFine(id, formData);
      if (result.success) {
        setSuccess(result.message ?? null);
        startTransition(() => router.refresh());
      } else {
        setError(result.error || "Erreur lors de la mise à jour");
      }
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette amende ?")) return;
    setLoading(id);
    setError(null);
    setSuccess(null);
    try {
      const result = await deleteFine(id);
      if (result.success) {
        setSuccess(result.message ?? null);
        startTransition(() => router.refresh());
      } else {
        setError(result.error || "Erreur lors de la suppression");
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="container-fluid px-0">
      <div className="d-flex justify-content-between align-items-center mb-4 gap-2">
        <h1 className="h4 mb-0">Amendes</h1>
        <Link
          href="/admin/fines/create"
          className="btn btn-primary"
        >
          <i className="fas fa-plus me-2" aria-hidden="true" />
          Nouvelle amende
        </Link>
      </div>

      <div className="d-flex flex-wrap gap-2 mb-4">
        {TABS.map((tab) => (
          <Link
            key={tab.label}
            href={tab.value ? `/admin/fines?type=${tab.value}` : "/admin/fines"}
            className={`btn btn-sm ${
              activeType === tab.value ? "btn-primary" : "btn-outline-secondary"
            }`}
          >
            {tab.label}
          </Link>
        ))}
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

      <div className="card">
        <div className="card-body">
        {fines.length === 0 ? (
          <p className="text-muted text-center py-5 mb-0">Aucune amende enregistrée</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Concerné</th>
                  <th>Motif</th>
                  <th>Montant (DT)</th>
                  <th>Échéance</th>
                  <th>Statut</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {fines.map((f) => (
                  <tr key={f.id}>
                    <td>{TYPE_LABELS[f.type] ?? f.type}</td>
                    <td>{f.player ? `${f.player.firstNameFr} ${f.player.lastNameFr}` : (f.directorNameFr ?? "—")}</td>
                    <td>{f.reasonFr}</td>
                    <td>{f.amount.toFixed(3)}</td>
                    <td>{f.dueDate ? new Date(f.dueDate).toLocaleDateString("fr-TN") : "—"}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGES[f.status]}`}>
                        {f.status}
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="d-inline-flex gap-2">
                        {f.status !== "PAID" && (
                          <button
                            type="button"
                            onClick={() => markPaid(f.id)}
                            disabled={loading === f.id || isPending}
                            className="btn btn-sm btn-outline-success"
                          >
                            Payée
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(f.id)}
                          disabled={loading === f.id || isPending}
                          className="btn btn-sm btn-outline-danger"
                        >
                          <i className="fas fa-trash" aria-hidden="true" />
                          <span className="visually-hidden">Supprimer</span>
                        </button>
                      </div>
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
