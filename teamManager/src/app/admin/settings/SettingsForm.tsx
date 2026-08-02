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

  const inputClass =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="rounded-md border border-red-200 bg-red-50 text-red-700 px-4 py-3 mb-4">{error}</div>}
      {success && <div className="rounded-md border border-green-200 bg-green-50 text-green-700 px-4 py-3 mb-4">{success}</div>}

      <div className="bg-white rounded-lg shadow border border-gray-200 mb-4">
        <div className="px-5 py-4 border-b border-gray-200 font-semibold">Discipline</div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Jaunes avant suspension</label>
            <input type="number" name="yellowsBeforeSuspend" min={1} max={10} defaultValue={settings.yellowsBeforeSuspend} className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>Rouge simple — matchs</label>
            <input type="number" name="redCard1Matches" min={1} max={10} defaultValue={settings.redCard1Matches} className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>Rouge grave — matchs</label>
            <input type="number" name="redCard2Matches" min={1} max={10} defaultValue={settings.redCard2Matches} className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>Rouge très grave — matchs</label>
            <input type="number" name="redCard3Matches" min={1} max={10} defaultValue={settings.redCard3Matches} className={inputClass} required />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 mb-4">
        <div className="px-5 py-4 border-b border-gray-200 font-semibold">Amendes</div>
        <div className="p-5 grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Amende jaune (DT)</label>
            <input type="number" step="0.001" min={0} name="yellowFineAmount" defaultValue={settings.yellowFineAmount} className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>Amende rouge (DT)</label>
            <input type="number" step="0.001" min={0} name="redFineAmount" defaultValue={settings.redFineAmount} className={inputClass} required />
          </div>
          <div>
            <label className={labelClass}>Délai de paiement (jours)</label>
            <input type="number" min={1} name="fineDueDays" defaultValue={settings.fineDueDays} className={inputClass} required />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200 mb-4">
        <div className="px-5 py-4 border-b border-gray-200 font-semibold">Notifications</div>
        <div className="p-5">
          <label className={labelClass}>Emails d&apos;alerte (séparés par des virgules)</label>
          <input type="text" name="alertEmails" defaultValue={settings.alertEmails} className={inputClass} placeholder="email1@example.com, email2@example.com" />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 transition-colors disabled:opacity-60"
        >
          {loading ? <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" /> : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
