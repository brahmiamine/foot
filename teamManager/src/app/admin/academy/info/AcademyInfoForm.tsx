"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveAcademyInfo } from "../actions";

interface AcademyInfoData {
  philosophyFr: string;
  philosophyAr: string;
  methodFr: string;
  methodAr: string;
  supervisionFr: string;
  supervisionAr: string;
  infrastructureFr: string;
  infrastructureAr: string;
  detectionFr: string;
  detectionAr: string;
}

export function AcademyInfoForm({ initialData }: { initialData: AcademyInfoData }) {
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
      const result = await saveAcademyInfo(formData);
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

  const section = (label: string, fieldFr: keyof AcademyInfoData, fieldAr: keyof AcademyInfoData) => (
    <div className="card mb-4">
      <div className="card-header fw-semibold">{label}</div>
      <div className="card-body">
        <div className="row g-3">
          <div className="col-12 col-lg-6">
            <label className="form-label">{label} (français)</label>
            <textarea name={fieldFr} className="form-control" rows={5} defaultValue={initialData[fieldFr]} />
          </div>
          <div className="col-12 col-lg-6">
            <label className="form-label">{label} (arabe)</label>
            <textarea name={fieldAr} className="form-control" rows={5} dir="rtl" defaultValue={initialData[fieldAr]} />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-danger mb-4">{error}</div>}
      {success && <div className="alert alert-success mb-4">{success}</div>}

      {section("Philosophie de formation", "philosophyFr", "philosophyAr")}
      {section("Méthode", "methodFr", "methodAr")}
      {section("Encadrement", "supervisionFr", "supervisionAr")}
      {section("Infrastructures", "infrastructureFr", "infrastructureAr")}
      {section("Détection", "detectionFr", "detectionAr")}

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}
