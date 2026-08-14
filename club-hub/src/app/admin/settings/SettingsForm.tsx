"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateSettings } from "./actions";

interface SettingsData {
  yellowsBeforeSuspend: number;
  redCard1Matches: number;
  redCard2Matches: number;
  redCard3Matches: number;
  yellowFineAmount: number;
  redFineAmount: number;
  fineDueDays: number;
  alertEmails: string;
}

/** Formulaire des réglages globaux — port de cardManager/components/settings/SettingsForm. */
export function SettingsForm({ settings }: { settings: SettingsData }) {
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
      const result = await updateSettings(formData);
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

  const inputClass = "form-control";
  const labelClass = "form-label";

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-danger mb-4">{error}</div>}
      {success && <div className="alert alert-success mb-4">{success}</div>}

      <div className="card mb-4">
        <div className="card-header fw-semibold">Discipline</div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-12 col-md-6">
            <label className={labelClass}>Jaunes avant suspension</label>
            <input type="number" name="yellowsBeforeSuspend" min={1} max={10} defaultValue={settings.yellowsBeforeSuspend} className={inputClass} required />
            </div>
            <div className="col-12 col-md-6">
            <label className={labelClass}>Rouge simple — matchs</label>
            <input type="number" name="redCard1Matches" min={1} max={10} defaultValue={settings.redCard1Matches} className={inputClass} required />
            </div>
            <div className="col-12 col-md-6">
            <label className={labelClass}>Rouge grave — matchs</label>
            <input type="number" name="redCard2Matches" min={1} max={10} defaultValue={settings.redCard2Matches} className={inputClass} required />
            </div>
            <div className="col-12 col-md-6">
            <label className={labelClass}>Rouge très grave — matchs</label>
            <input type="number" name="redCard3Matches" min={1} max={10} defaultValue={settings.redCard3Matches} className={inputClass} required />
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header fw-semibold">Amendes</div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-12 col-md-6">
            <label className={labelClass}>Amende jaune (DT)</label>
            <input type="number" step="0.001" min={0} name="yellowFineAmount" defaultValue={settings.yellowFineAmount} className={inputClass} required />
            </div>
            <div className="col-12 col-md-6">
            <label className={labelClass}>Amende rouge (DT)</label>
            <input type="number" step="0.001" min={0} name="redFineAmount" defaultValue={settings.redFineAmount} className={inputClass} required />
            </div>
            <div className="col-12 col-md-6">
            <label className={labelClass}>Délai de paiement (jours)</label>
            <input type="number" min={1} name="fineDueDays" defaultValue={settings.fineDueDays} className={inputClass} required />
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header fw-semibold">Notifications</div>
        <div className="card-body">
          <label className={labelClass}>Emails d&apos;alerte (séparés par des virgules)</label>
          <input type="text" name="alertEmails" defaultValue={settings.alertEmails} className={inputClass} placeholder="email1@example.com, email2@example.com" />
        </div>
      </div>

      <div className="d-flex justify-content-end">
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
