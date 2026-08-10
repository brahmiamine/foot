"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveHistory } from "../actions";

interface HistoryData {
  foundedDate: string;
  storyFr: string;
  storyAr: string;
}

export function HistoryForm({ initialData }: { initialData: HistoryData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    try {
      const result = await saveHistory(formData);
      if (result.success) {
        setSuccess(result.message ?? null);
        router.refresh();
      } else {
        setError(result.error || "Erreur lors de l'enregistrement");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-danger mb-4">{error}</div>}
      {success && <div className="alert alert-success mb-4">{success}</div>}

      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <label className="form-label">Date de création du club</label>
              <input type="date" name="foundedDate" className="form-control" defaultValue={initialData.foundedDate} />
            </div>
            <div className="col-12 col-lg-6">
              <label className="form-label">Récit de l&apos;histoire (français)</label>
              <textarea name="storyFr" className="form-control" rows={12} defaultValue={initialData.storyFr} />
            </div>
            <div className="col-12 col-lg-6">
              <label className="form-label">Récit de l&apos;histoire (arabe)</label>
              <textarea name="storyAr" className="form-control" rows={12} dir="rtl" defaultValue={initialData.storyAr} />
            </div>
          </div>
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}
