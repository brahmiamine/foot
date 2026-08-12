"use client";

import { useI18n } from "@/i18n/I18nProvider";

import { useRef, useState } from "react";
import { submitRecruitmentApplication } from "./actions";

export function RecruitmentForm({ teamId }: { teamId: string }) {
  const { t } = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await submitRecruitmentApplication(teamId, formData);
      if (result.success) {
        setSuccess(result.message ?? null);
        formRef.current?.reset();
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
            <button type="button" onClick={() => setError(null)} aria-label={t("close")} className="btn-close" />
          </div>
        </div>
      )}

      <div className="col-md-6">
        <label htmlFor="name" className="form-label">
          {t("fullName")} *
        </label>
        <input id="name" name="name" type="text" className="form-control" required maxLength={150} />
      </div>
      <div className="col-md-6">
        <label htmlFor="birthDate" className="form-label">
          {t("birthDate")} *
        </label>
        <input id="birthDate" name="birthDate" type="date" className="form-control" required />
      </div>
      <div className="col-md-4">
        <label htmlFor="category" className="form-label">
          {t("category")} *
        </label>
        <input id="category" name="category" type="text" className="form-control" placeholder="U15, Seniors..." required maxLength={20} />
      </div>
      <div className="col-md-4">
        <label htmlFor="position" className="form-label">
          {t("position")} *
        </label>
        <input id="position" name="position" type="text" className="form-control" placeholder="Gardien, Défenseur..." required maxLength={50} />
      </div>
      <div className="col-md-4">
        <label htmlFor="currentClub" className="form-label">
          {t("currentClub")}
        </label>
        <input id="currentClub" name="currentClub" type="text" className="form-control" maxLength={150} />
      </div>
      <div className="col-md-6">
        <label htmlFor="parentPhone" className="form-label">
          {t("playerParentPhone")} *
        </label>
        <input id="parentPhone" name="parentPhone" type="tel" className="form-control" required maxLength={30} />
      </div>
      <div className="col-md-6">
        <label htmlFor="email" className="form-label">
          {t("email")}
        </label>
        <input id="email" name="email" type="email" className="form-control" maxLength={190} />
      </div>
      <div className="col-12">
        <label htmlFor="videoUrl" className="form-label">
          {t("videoLink")}
        </label>
        <input id="videoUrl" name="videoUrl" type="text" className="form-control" placeholder="https://..." maxLength={255} />
      </div>
      <div className="col-12">
        <label htmlFor="message" className="form-label">
          {t("message")}
        </label>
        <textarea id="message" name="message" className="form-control" rows={3} maxLength={2000} />
      </div>

      <div className="col-12">
        <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
          {submitting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
              {t("sending")}
            </>
          ) : (
            t("sendRecruitment")
          )}
        </button>
      </div>
    </form>
  );
}
