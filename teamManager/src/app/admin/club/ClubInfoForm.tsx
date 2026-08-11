"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveClubInfo } from "./actions";

interface ClubInfoData {
  presentationFr: string;
  presentationAr: string;
  valuesFr: string;
  valuesAr: string;
  sportProjectFr: string;
  sportProjectAr: string;
  organizationFr: string;
  organizationAr: string;
}

export function ClubInfoForm({ initialData }: { initialData: ClubInfoData }) {
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
      const result = await saveClubInfo(formData);
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

  const section = (label: string, fieldFr: string, fieldAr: string) => (
    <div className="card mb-4">
      <div className="card-header fw-semibold">{label}</div>
      <div className="card-body">
        <div className="row g-3">
          <div className="col-12 col-lg-6">
            <label className="form-label">{label} (français)</label>
            <textarea name={fieldFr} className="form-control" rows={5} defaultValue={initialData[fieldFr as keyof ClubInfoData]} />
          </div>
          <div className="col-12 col-lg-6">
            <label className="form-label">{label} (arabe)</label>
            <textarea name={fieldAr} className="form-control" rows={5} dir="rtl" defaultValue={initialData[fieldAr as keyof ClubInfoData]} />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-danger mb-4">{error}</div>}
      {success && <div className="alert alert-success mb-4">{success}</div>}

      {section("Qui sommes-nous ?", "presentationFr", "presentationAr")}
      {section("Valeurs", "valuesFr", "valuesAr")}
      {section("Projet sportif", "sportProjectFr", "sportProjectAr")}
      {section("Organisation", "organizationFr", "organizationAr")}

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}
