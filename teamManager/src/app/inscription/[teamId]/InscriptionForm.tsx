"use client";

import { useRef, useState } from "react";
import { submitPlayerApplication } from "./actions";

export function InscriptionForm({ teamId, categoryOptions }: { teamId: string; categoryOptions: string[] }) {
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      setError("Type de fichier non autorisé (JPEG, PNG, WebP ou PDF uniquement).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Le fichier est trop volumineux (5MB maximum).");
      return;
    }

    setError(null);
    setDocumentFile(file);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      let documentUrl = "";
      if (documentFile) {
        const uploadFormData = new FormData();
        uploadFormData.append("file", documentFile);
        const uploadRes = await fetch("/api/upload/application-document", { method: "POST", body: uploadFormData });
        const uploadResult = await uploadRes.json();
        if (!uploadResult.success) {
          throw new Error(uploadResult.error || "Erreur lors de l'envoi du fichier");
        }
        documentUrl = uploadResult.path;
      }

      const formData = new FormData(e.currentTarget);
      if (documentUrl) formData.set("documentUrl", documentUrl);

      const result = await submitPlayerApplication(teamId, formData);
      if (result.success) {
        setSuccess(result.message ?? null);
        formRef.current?.reset();
        setDocumentFile(null);
      } else {
        setError(result.error || "Erreur lors de l'envoi de la candidature");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi de la candidature");
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

      <div className="col-12">
        <h6 className="text-muted text-uppercase small mb-0">L&apos;enfant</h6>
      </div>
      <div className="col-md-6">
        <label htmlFor="childFirstName" className="form-label">
          Prénom *
        </label>
        <input id="childFirstName" name="childFirstName" type="text" className="form-control" required maxLength={100} />
      </div>
      <div className="col-md-6">
        <label htmlFor="childLastName" className="form-label">
          Nom *
        </label>
        <input id="childLastName" name="childLastName" type="text" className="form-control" required maxLength={100} />
      </div>
      <div className="col-md-6">
        <label htmlFor="birthDate" className="form-label">
          Date de naissance *
        </label>
        <input id="birthDate" name="birthDate" type="date" className="form-control" required />
      </div>
      <div className="col-md-3">
        <label htmlFor="category" className="form-label">
          Catégorie *
        </label>
        <select id="category" name="category" className="form-select" required defaultValue="">
          <option value="" disabled>
            Choisir...
          </option>
          {categoryOptions.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </div>
      <div className="col-md-3">
        <label htmlFor="position" className="form-label">
          Poste
        </label>
        <input id="position" name="position" type="text" className="form-control" maxLength={50} />
      </div>

      <div className="col-12 mt-4">
        <h6 className="text-muted text-uppercase small mb-0">Le parent</h6>
      </div>
      <div className="col-md-6">
        <label htmlFor="parentName" className="form-label">
          Nom du parent *
        </label>
        <input id="parentName" name="parentName" type="text" className="form-control" required maxLength={150} />
      </div>
      <div className="col-md-6">
        <label htmlFor="parentPhone" className="form-label">
          Téléphone *
        </label>
        <input id="parentPhone" name="parentPhone" type="tel" className="form-control" required maxLength={30} />
      </div>
      <div className="col-12">
        <label htmlFor="parentEmail" className="form-label">
          Email *
        </label>
        <input id="parentEmail" name="parentEmail" type="email" className="form-control" required maxLength={190} />
      </div>

      <div className="col-12">
        <label htmlFor="document" className="form-label">
          Photo ou document (facultatif)
        </label>
        <input id="document" name="document" type="file" accept="image/*,application/pdf" className="form-control" onChange={handleFileChange} />
        {documentFile && <div className="form-text">{documentFile.name}</div>}
      </div>

      <div className="col-12">
        <label htmlFor="message" className="form-label">
          Message
        </label>
        <textarea id="message" name="message" className="form-control" rows={3} maxLength={2000} />
      </div>

      <div className="col-12">
        <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
          {submitting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
              Envoi en cours...
            </>
          ) : (
            "Envoyer la candidature"
          )}
        </button>
      </div>
    </form>
  );
}
