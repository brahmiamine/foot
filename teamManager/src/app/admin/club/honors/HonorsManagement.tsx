"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/hooks/useConfirm";
import { createHonor, updateHonor, deleteHonor } from "../actions";

interface HonorData {
  id: number;
  competitionFr: string;
  competitionAr: string | null;
  titleCount: number;
  yearsFr: string | null;
  icon: string | null;
  displayOrder: number;
}

type FormMode = "add" | "edit" | null;

export function HonorsManagement({ initialHonors }: { initialHonors: HonorData[] }) {
  const router = useRouter();
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editing, setEditing] = useState<HonorData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, confirmDialog } = useConfirm();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);

    try {
      const result = editing ? await updateHonor(editing.id, formData) : await createHonor(formData);
      if (result.success) {
        setFormMode(null);
        setEditing(null);
        router.refresh();
      } else {
        setError(result.error || "Erreur");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(honor: HonorData) {
    const ok = await confirm(`Supprimer "${honor.competitionFr}" du palmarès ?`, { variant: "danger" });
    if (!ok) return;
    await deleteHonor(honor.id);
    router.refresh();
  }

  return (
    <div>
      {confirmDialog}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <p className="text-muted mb-0">Titres, coupes, records — affichés sur la page publique /club/histoire.</p>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            setEditing(null);
            setFormMode(formMode === "add" ? null : "add");
          }}
        >
          {formMode === "add" ? "Annuler" : "+ Ajouter"}
        </button>
      </div>

      {formMode && (
        <form onSubmit={handleSubmit} className="card mb-4">
          <div className="card-body row g-3">
            {error && (
              <div className="col-12">
                <div className="alert alert-danger mb-0">{error}</div>
              </div>
            )}
            <div className="col-12 col-md-3">
              <label className="form-label">Icône (emoji)</label>
              <input name="icon" className="form-control" placeholder="🏆" defaultValue={editing?.icon ?? ""} />
            </div>
            <div className="col-12 col-md-9">
              <label className="form-label">Compétition (français) *</label>
              <input name="competitionFr" className="form-control" required defaultValue={editing?.competitionFr ?? ""} />
            </div>
            <div className="col-12 col-md-6">
              <label className="form-label">Compétition (arabe)</label>
              <input name="competitionAr" className="form-control" dir="rtl" defaultValue={editing?.competitionAr ?? ""} />
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label">Nombre de titres</label>
              <input type="number" name="titleCount" min={0} className="form-control" defaultValue={editing?.titleCount ?? 0} />
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label">Ordre d&apos;affichage</label>
              <input type="number" name="displayOrder" className="form-control" defaultValue={editing?.displayOrder ?? 0} />
            </div>
            <div className="col-12">
              <label className="form-label">Années (ex: 1985, 1990, 1998)</label>
              <input name="yearsFr" className="form-control" defaultValue={editing?.yearsFr ?? ""} />
            </div>
            <div className="col-12">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? "Enregistrement..." : editing ? "Modifier" : "Ajouter"}
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead>
            <tr>
              <th></th>
              <th>Compétition</th>
              <th>Titres</th>
              <th>Années</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {initialHonors.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-muted py-4">
                  Aucun palmarès enregistré.
                </td>
              </tr>
            )}
            {initialHonors.map((honor) => (
              <tr key={honor.id}>
                <td>{honor.icon}</td>
                <td>{honor.competitionFr}</td>
                <td>{honor.titleCount}</td>
                <td>{honor.yearsFr}</td>
                <td className="text-end">
                  <button
                    className="btn btn-sm btn-outline-secondary me-2"
                    onClick={() => {
                      setEditing(honor);
                      setFormMode("edit");
                    }}
                  >
                    Modifier
                  </button>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(honor)}>
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
