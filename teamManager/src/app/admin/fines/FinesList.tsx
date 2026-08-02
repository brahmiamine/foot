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
  PENDING: "bg-amber-100 text-amber-800",
  PAID: "bg-green-100 text-green-800",
  OVERDUE: "bg-red-100 text-red-800",
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
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Amendes</h1>
        <Link
          href="/admin/fines/create"
          className="inline-flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 transition-colors"
        >
          <i className="fas fa-plus mr-2" aria-hidden="true" />
          Nouvelle amende
        </Link>
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {TABS.map((tab) => (
          <Link
            key={tab.label}
            href={tab.value ? `/admin/fines?type=${tab.value}` : "/admin/fines"}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeType === tab.value ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 text-red-700 px-4 py-3 mb-4 flex justify-between items-start">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Fermer" className="ml-3 text-red-700/70 hover:text-red-700">
            ✕
          </button>
        </div>
      )}
      {success && (
        <div className="rounded-md border border-green-200 bg-green-50 text-green-700 px-4 py-3 mb-4 flex justify-between items-start">
          <span>{success}</span>
          <button type="button" onClick={() => setSuccess(null)} aria-label="Fermer" className="ml-3 text-green-700/70 hover:text-green-700">
            ✕
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow border border-gray-200 p-5">
        {fines.length === 0 ? (
          <p className="text-gray-500 text-center py-10 mb-0">Aucune amende enregistrée</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200 text-gray-500 uppercase text-xs tracking-wide">
                  <th className="p-2">Type</th>
                  <th className="p-2">Concerné</th>
                  <th className="p-2">Motif</th>
                  <th className="p-2">Montant (DT)</th>
                  <th className="p-2">Échéance</th>
                  <th className="p-2">Statut</th>
                  <th className="p-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {fines.map((f) => (
                  <tr key={f.id} className="border-b border-gray-100 align-middle">
                    <td className="p-3">{TYPE_LABELS[f.type] ?? f.type}</td>
                    <td className="p-3">{f.player ? `${f.player.firstNameFr} ${f.player.lastNameFr}` : (f.directorNameFr ?? "—")}</td>
                    <td className="p-3">{f.reasonFr}</td>
                    <td className="p-3">{f.amount.toFixed(3)}</td>
                    <td className="p-3">{f.dueDate ? new Date(f.dueDate).toLocaleDateString("fr-TN") : "—"}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_BADGES[f.status]}`}>
                        {f.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex gap-2 justify-end">
                        {f.status !== "PAID" && (
                          <button
                            type="button"
                            onClick={() => markPaid(f.id)}
                            disabled={loading === f.id || isPending}
                            className="inline-flex items-center justify-center rounded-md border border-green-300 text-green-700 hover:bg-green-50 px-3 py-1 text-sm transition-colors disabled:opacity-60"
                          >
                            Payée
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(f.id)}
                          disabled={loading === f.id || isPending}
                          className="inline-flex items-center justify-center rounded-md border border-red-300 text-red-600 hover:bg-red-50 px-3 py-1 text-sm transition-colors disabled:opacity-60"
                        >
                          <i className="fas fa-trash" aria-hidden="true" />
                          <span className="sr-only">Supprimer</span>
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
  );
}
