"use client";

import { useI18n } from "@/i18n/I18nProvider";

import { useRef, useState } from "react";
import { submitContactMessage } from "./actions";

export function ContactForm({ teamId }: { teamId: string }) {
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
      const result = await submitContactMessage(teamId, formData);
      if (result.success) {
        setSuccess(t(result.messageKey));
        formRef.current?.reset();
      } else {
        setError(t(result.messageKey));
      }
    } catch {
      setError(t("contact.form.feedback.error"));
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
            <button type="button" onClick={() => setError(null)} aria-label={t("common.actions.close")} className="btn-close" />
          </div>
        </div>
      )}

      <div className="col-md-6">
        <label htmlFor="name" className="form-label">
          {t("common.fields.lastName")} *
        </label>
        <input id="name" name="name" type="text" className="form-control" required maxLength={150} />
      </div>
      <div className="col-md-6">
        <label htmlFor="email" className="form-label">
          {t("contact.form.fields.email")} *
        </label>
        <input id="email" name="email" type="email" className="form-control" required maxLength={190} />
      </div>
      <div className="col-md-4">
        <label htmlFor="department" className="form-label">
          {t("contact.form.fields.department")}
        </label>
        <select id="department" name="department" className="form-select" defaultValue="GENERAL">
          <option value="GENERAL">{t("contact.departments.general")}</option>
          <option value="ADMINISTRATIF">{t("contact.departments.administrative")}</option>
          <option value="SPORTIF">{t("contact.departments.sport")}</option>
          <option value="ACADEMIE">{t("navigation.academy")}</option>
          <option value="PARTENARIAT">{t("contact.departments.partnerships")}</option>
        </select>
      </div>
      <div className="col-md-8">
        <label htmlFor="subject" className="form-label">
          {t("contact.form.fields.subject")} *
        </label>
        <input id="subject" name="subject" type="text" className="form-control" required maxLength={200} />
      </div>
      <div className="col-12">
        <label htmlFor="message" className="form-label">
          {t("common.fields.message")} *
        </label>
        <textarea id="message" name="message" className="form-control" rows={5} required maxLength={3000} />
      </div>

      <div className="col-12">
        <button type="submit" className="btn btn-primary w-100" disabled={submitting}>
          {submitting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
              {t("common.status.sending")}
            </>
          ) : (
            t("contact.form.actions.send")
          )}
        </button>
      </div>
    </form>
  );
}
