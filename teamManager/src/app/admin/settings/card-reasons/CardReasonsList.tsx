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

  const inputClass =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none";

  return (
    <div>
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

      <div className="bg-white rounded-lg shadow border border-gray-200 mb-4">
        <div className="px-5 py-4 border-b border-gray-200 font-semibold">Ajouter un motif</div>
        <div className="p-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleCreate(formData);
              e.currentTarget.reset();
            }}
            className="flex flex-wrap items-end gap-2"
          >
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs text-gray-500 mb-0.5">Libellé (FR)</label>
              <input type="text" name="labelFr" className={inputClass} required minLength={2} />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs text-gray-500 mb-0.5">Libellé (AR)</label>
              <input type="text" name="labelAr" className={inputClass} dir="rtl" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-0.5">Type</label>
              <select name="type" className={inputClass} defaultValue="BOTH">
                <option value="BOTH">Les deux</option>
                <option value="YELLOW">Jaune</option>
                <option value="RED">Rouge</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loading || isPending}
              className="inline-flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 transition-colors disabled:opacity-60"
            >
              <i className="fas fa-plus" aria-hidden="true" />
            </button>
          </form>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 p-5">
        {reasons.length === 0 ? (
          <p className="text-gray-500 text-center py-8 mb-0">Aucun motif enregistré</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200 text-gray-500 uppercase text-xs tracking-wide">
                  <th className="p-2">Libellé</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Actif</th>
                  <th className="p-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reasons.map((r) => (
                  <tr key={r.id} className="border-b border-gray-100 align-middle">
                    <td className="p-3">
                      {r.labelFr}
                      {r.labelAr && (
                        <div className="text-xs text-gray-500" dir="rtl">
                          {r.labelAr}
                        </div>
                      )}
                    </td>
                    <td className="p-3">{TYPE_LABELS[r.type]}</td>
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={r.isActive}
                        onChange={() => toggleActive(r)}
                        disabled={loading || isPending}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-60"
                      />
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(r.id)}
                        disabled={loading || isPending}
                        className="inline-flex items-center justify-center rounded-md border border-red-300 text-red-600 hover:bg-red-50 px-3 py-1 text-sm transition-colors disabled:opacity-60"
                      >
                        <i className="fas fa-trash" aria-hidden="true" />
                        <span className="sr-only">Supprimer</span>
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
  );
}
