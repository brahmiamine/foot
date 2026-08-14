"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { updateInjuryAction } from "@/app/actions";
import type { Injury, InjurySeverity } from "@/entities/Injury";

const SEVERITY_LABEL: Record<InjurySeverity, string> = { MINOR: "Légère", MODERATE: "Modérée", SEVERE: "Sévère" };

export function InjuryEditForm({ injury }: { injury: Injury }) {
  const [zone, setZone] = useState(injury.zone);
  const [severity, setSeverity] = useState<InjurySeverity>(injury.severity);
  const [diagnosis, setDiagnosis] = useState(injury.diagnosis ?? "");
  const [expectedReturnDate, setExpectedReturnDate] = useState(injury.expectedReturnDate ?? "");
  const [progressiveReturn, setProgressiveReturn] = useState(injury.progressiveReturn);
  const [progressiveReturnNotes, setProgressiveReturnNotes] = useState(injury.progressiveReturnNotes ?? "");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    startTransition(async () => {
      await updateInjuryAction(injury.id, {
        zone,
        severity,
        diagnosis: diagnosis || null,
        expectedReturnDate: expectedReturnDate || null,
        progressiveReturn,
        progressiveReturnNotes: progressiveReturnNotes || null,
      });
      router.refresh();
    });
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <FormField label="Zone">
          <Input value={zone} onChange={(e) => setZone(e.target.value)} />
        </FormField>
        <FormField label="Gravité">
          <Select value={severity} onChange={(e) => setSeverity(e.target.value as InjurySeverity)}>
            {(Object.keys(SEVERITY_LABEL) as InjurySeverity[]).map((s) => (
              <option key={s} value={s}>
                {SEVERITY_LABEL[s]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Retour estimé">
          <Input type="date" value={expectedReturnDate} onChange={(e) => setExpectedReturnDate(e.target.value)} />
        </FormField>
        <FormField label="Reprise progressive">
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", padding: "0.55rem 0" }}>
            <input type="checkbox" checked={progressiveReturn} onChange={(e) => setProgressiveReturn(e.target.checked)} />
            Oui
          </label>
        </FormField>
      </div>
      <FormField label="Diagnostic">
        <Textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} rows={3} />
      </FormField>
      {progressiveReturn && (
        <FormField label="Notes de reprise progressive">
          <Textarea value={progressiveReturnNotes} onChange={(e) => setProgressiveReturnNotes(e.target.value)} rows={2} />
        </FormField>
      )}
      <div>
        <Button variant="primary" disabled={pending} onClick={submit}>
          {pending ? "…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}
