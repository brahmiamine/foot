"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, Textarea } from "@/components/ui/Field";
import { createInjuryAction } from "@/app/actions";
import type { InjurySeverity } from "@/entities/Injury";

interface RosterOption {
  id: string;
  label: string;
}

const SEVERITY_LABEL: Record<InjurySeverity, string> = { MINOR: "Légère", MODERATE: "Modérée", SEVERE: "Sévère" };

export function CreateInjuryForm({ roster }: { roster: RosterOption[] }) {
  const [open, setOpen] = useState(false);
  const [playerId, setPlayerId] = useState(roster[0]?.id ?? "");
  const [injuryDate, setInjuryDate] = useState(new Date().toISOString().slice(0, 10));
  const [zone, setZone] = useState("");
  const [severity, setSeverity] = useState<InjurySeverity>("MINOR");
  const [diagnosis, setDiagnosis] = useState("");
  const [expectedReturnDate, setExpectedReturnDate] = useState("");
  const [progressiveReturn, setProgressiveReturn] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!open) {
    return (
      <Button variant="primary" onClick={() => setOpen(true)} disabled={roster.length === 0}>
        + Nouvelle blessure
      </Button>
    );
  }

  function submit() {
    if (!playerId || !zone) return;
    startTransition(async () => {
      await createInjuryAction({
        playerId,
        injuryDate,
        zone,
        severity,
        diagnosis: diagnosis || undefined,
        expectedReturnDate: expectedReturnDate || undefined,
        progressiveReturn,
      });
      setOpen(false);
      setZone("");
      setDiagnosis("");
      setExpectedReturnDate("");
      router.refresh();
    });
  }

  return (
    <div style={{ border: "1px solid var(--mh-border)", borderRadius: "var(--mh-radius-lg)", padding: "1.25rem", background: "var(--mh-surface)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <FormField label="Joueur" required>
          <Select value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
            {roster.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Date de blessure" required>
          <Input type="date" value={injuryDate} onChange={(e) => setInjuryDate(e.target.value)} />
        </FormField>
        <FormField label="Zone" required>
          <Input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Ex : Ischio-jambiers" />
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
      <div style={{ marginTop: 12 }}>
        <FormField label="Diagnostic">
          <Textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} rows={3} />
        </FormField>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Button variant="primary" disabled={pending || !playerId || !zone} onClick={submit}>
          {pending ? "…" : "Enregistrer"}
        </Button>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
