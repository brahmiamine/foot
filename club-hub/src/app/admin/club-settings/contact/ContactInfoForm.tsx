"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveContactInfo } from "../actions";

interface ContactInfoData {
  addressFr: string;
  addressAr: string;
  phone: string;
  email: string;
  openingHoursFr: string;
  openingHoursAr: string;
  mapEmbedUrl: string;
  adminPhone: string;
  adminEmail: string;
  sportPhone: string;
  sportEmail: string;
  academyPhone: string;
  academyEmail: string;
  partnershipPhone: string;
  partnershipEmail: string;
}

export function ContactInfoForm({ initialData }: { initialData: ContactInfoData }) {
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
      const result = await saveContactInfo(formData);
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

  const department = (label: string, phoneField: keyof ContactInfoData, emailField: keyof ContactInfoData) => (
    <div className="col-12 col-md-6 col-lg-3">
      <label className="form-label fw-semibold">{label}</label>
      <input name={phoneField} className="form-control mb-2" placeholder="Téléphone" defaultValue={initialData[phoneField]} />
      <input name={emailField} type="email" className="form-control" placeholder="Email" defaultValue={initialData[emailField]} />
    </div>
  );

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-danger mb-4">{error}</div>}
      {success && <div className="alert alert-success mb-4">{success}</div>}

      <div className="card mb-4">
        <div className="card-header fw-semibold">Coordonnées générales</div>
        <div className="card-body row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label">Adresse (français)</label>
            <input name="addressFr" className="form-control" defaultValue={initialData.addressFr} />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Adresse (arabe)</label>
            <input name="addressAr" className="form-control" dir="rtl" defaultValue={initialData.addressAr} />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">Téléphone</label>
            <input name="phone" className="form-control" defaultValue={initialData.phone} />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">Email</label>
            <input name="email" type="email" className="form-control" defaultValue={initialData.email} />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label">Lien carte (embed)</label>
            <input name="mapEmbedUrl" className="form-control" placeholder="https://www.google.com/maps/embed?..." defaultValue={initialData.mapEmbedUrl} />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Horaires (français)</label>
            <input name="openingHoursFr" className="form-control" placeholder="Lun-Ven 9h-17h" defaultValue={initialData.openingHoursFr} />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label">Horaires (arabe)</label>
            <input name="openingHoursAr" className="form-control" dir="rtl" defaultValue={initialData.openingHoursAr} />
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header fw-semibold">Contacts par département</div>
        <div className="card-body row g-3">
          {department("Administratif", "adminPhone", "adminEmail")}
          {department("Sportif", "sportPhone", "sportEmail")}
          {department("Académie", "academyPhone", "academyEmail")}
          {department("Partenariats", "partnershipPhone", "partnershipEmail")}
        </div>
      </div>

      <button type="submit" className="btn btn-primary" disabled={loading}>
        {loading ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}
