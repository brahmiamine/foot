"use client";

import { useRef, useState } from "react";
import { submitSponsorRequest } from "./actions";

export function SponsorRequestForm({ teamId }: { teamId: string }) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      setError("Type de fichier non autorisé. Seules les images sont acceptées.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Le fichier est trop volumineux (5MB maximum).");
      return;
    }

    setError(null);
    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      let logoUrl = "";
      if (logoFile) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", logoFile);
        const uploadRes = await fetch("/api/upload/sponsor-logo", { method: "POST", body: uploadFormData });
        const uploadResult = await uploadRes.json();
        if (!uploadResult.success) {
          throw new Error(uploadResult.error || "Erreur lors de l'envoi du logo");
        }
        logoUrl = uploadResult.path;
      }

      const formData = new FormData(e.currentTarget);
      if (logoUrl) formData.set("logoUrl", logoUrl);

      const result = await submitSponsorRequest(teamId, formData);
      if (result.success) {
        setSuccess(result.message ?? null);
        formRef.current?.reset();
        setLogoFile(null);
        setLogoPreview(null);
      } else {
        setError(result.error || "Erreur lors de l'envoi de la demande");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi de la demande");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="alert alert-success mb-0 text-center py-4">
        <i className="fas fa-check-circle fa-2x mb-3 d-block" aria-hidden="true" />
        {success}
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="row g-3">
      {error && (
        <div className="col-12">
          <div className="alert alert-danger d-flex justify-content-between align-items-start mb-0">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Fermer" className="btn-close" />
          </div>
        </div>
      )}

      <div className="col-md-6">
        <label htmlFor="companyName" className="form-label">
          Nom de l&apos;entreprise *
        </label>
        <input id="companyName" name="companyName" type="text" className="form-control" required maxLength={200} />
      </div>
      <div className="col-md-6">
        <label htmlFor="contactName" className="form-label">
          Nom du contact *
        </label>
        <input id="contactName" name="contactName" type="text" className="form-control" required maxLength={150} />
      </div>
      <div className="col-md-6">
        <label htmlFor="email" className="form-label">
          Email *
        </label>
        <input id="email" name="email" type="email" className="form-control" required maxLength={190} />
      </div>
      <div className="col-md-6">
        <label htmlFor="phone" className="form-label">
          Téléphone
        </label>
        <input id="phone" name="phone" type="tel" className="form-control" maxLength={30} />
      </div>
      <div className="col-md-6">
        <label htmlFor="website" className="form-label">
          Site web
        </label>
        <input id="website" name="website" type="text" className="form-control" placeholder="https://..." maxLength={255} />
      </div>
      <div className="col-md-6">
        <label htmlFor="proposedLevel" className="form-label">
          Niveau de partenariat souhaité
        </label>
        <select id="proposedLevel" name="proposedLevel" className="form-select" defaultValue="">
          <option value="">Non défini</option>
          <option value="OR">Or — Sponsor principal</option>
          <option value="ARGENT">Argent — Sponsor officiel</option>
          <option value="BRONZE">Bronze — Partenaire</option>
          <option value="LOCAL">Local — Petit commerce</option>
        </select>
      </div>

      <div className="col-12">
        <label htmlFor="logo" className="form-label">
          Logo de l&apos;entreprise
        </label>
        <input id="logo" name="logo" type="file" accept="image/*" className="form-control" onChange={handleLogoChange} />
        {logoPreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoPreview} alt="Aperçu du logo" className="mt-2 border rounded p-1" style={{ height: "80px", objectFit: "contain" }} />
        )}
      </div>
      <div className="col-md-6">
        <label htmlFor="logoSize" className="form-label">
          Taille du logo fourni
        </label>
        <select id="logoSize" name="logoSize" className="form-select" defaultValue="">
          <option value="">Non précisé</option>
          <option value="SMALL">Petit</option>
          <option value="MEDIUM">Moyen</option>
          <option value="LARGE">Grand</option>
        </select>
      </div>

      <div className="col-12">
        <label htmlFor="message" className="form-label">
          Message / présentation de votre entreprise
        </label>
        <textarea id="message" name="message" className="form-control" rows={4} maxLength={2000} />
      </div>

      <div className="col-12">
        <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
          {submitting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
              Envoi en cours...
            </>
          ) : (
            "Envoyer ma demande de partenariat"
          )}
        </button>
      </div>
    </form>
  );
}
