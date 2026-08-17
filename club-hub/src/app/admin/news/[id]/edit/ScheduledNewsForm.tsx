"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelNewsSchedule, scheduleNewsPublication } from "./schedule-actions";

function toLocalInputValue(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

export function ScheduledNewsForm({
  newsId,
  scheduledAt,
}: {
  newsId: number;
  scheduledAt?: string | null;
}) {
  const [localValue, setLocalValue] = useState(() => toLocalInputValue(scheduledAt));
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submitSchedule() {
    setMessage(null);
    startTransition(async () => {
      try {
        const instant = new Date(localValue);
        if (!localValue || Number.isNaN(instant.getTime())) throw new Error("Date de publication invalide");
        const data = new FormData();
        data.set("scheduledAt", instant.toISOString());
        await scheduleNewsPublication(newsId, data);
        setMessage("Publication planifiée soumise à approbation.");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Planification impossible");
      }
    });
  }

  function cancelSchedule() {
    setMessage(null);
    startTransition(async () => {
      try {
        await cancelNewsSchedule(newsId);
        setLocalValue("");
        setMessage("Programmation annulée.");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Annulation impossible");
      }
    });
  }

  return (
    <div className="d-flex flex-column gap-2">
      <div className="d-flex gap-2 align-items-end flex-wrap">
        <label className="form-label mb-0">
          Date et heure
          <input
            className="form-control mt-1"
            type="datetime-local"
            value={localValue}
            onChange={(event) => setLocalValue(event.target.value)}
            required
          />
        </label>
        <button type="button" className="btn btn-outline-primary" disabled={pending} onClick={submitSchedule}>
          {pending ? "Traitement…" : "Soumettre pour publication planifiée"}
        </button>
      </div>
      {scheduledAt && (
        <div>
          <button type="button" className="btn btn-link btn-sm px-0" disabled={pending} onClick={cancelSchedule}>
            Annuler la programmation
          </button>
        </div>
      )}
      {message && <div className="small text-muted" role="status">{message}</div>}
    </div>
  );
}
