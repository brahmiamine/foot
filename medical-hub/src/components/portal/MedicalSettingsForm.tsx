"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { updateMedicalSettingsAction } from "@/app/actions";

export function MedicalSettingsForm({
  clearanceRequired: initialClearance,
  severeSecondOpinionRequired: initialSecondOpinion,
}: {
  clearanceRequired: boolean;
  severeSecondOpinionRequired: boolean;
}) {
  const [clearanceRequired, setClearanceRequired] = useState(initialClearance);
  const [severeSecondOpinionRequired, setSecondOpinionRequired] = useState(initialSecondOpinion);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <input
          type="checkbox"
          checked={clearanceRequired}
          onChange={(event) => setClearanceRequired(event.target.checked)}
        />
        <span>
          <strong>Clearance médicale obligatoire</strong>
          <span style={{ display: "block", fontSize: "0.82rem", color: "var(--mh-text-muted)" }}>
            Si désactivée, le passage FULL → AVAILABLE est possible sans étape CLEARANCE.
          </span>
        </span>
      </label>

      <label style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <input
          type="checkbox"
          checked={severeSecondOpinionRequired}
          disabled={!clearanceRequired}
          onChange={(event) => setSecondOpinionRequired(event.target.checked)}
        />
        <span>
          <strong>Second avis obligatoire pour une blessure sévère</strong>
          <span style={{ display: "block", fontSize: "0.82rem", color: "var(--mh-text-muted)" }}>
            Deux professionnels distincts doivent donner un avis favorable avant AVAILABLE.
          </span>
        </span>
      </label>

      {message && <div role="status" style={{ fontSize: "0.82rem", color: "var(--mh-text-muted)" }}>{message}</div>}

      <div>
        <Button
          variant="primary"
          disabled={pending}
          onClick={() => {
            setMessage(null);
            startTransition(async () => {
              try {
                await updateMedicalSettingsAction({
                  clearanceRequired,
                  severeSecondOpinionRequired,
                });
                setMessage("Paramètres médicaux enregistrés.");
              } catch (error) {
                setMessage(error instanceof Error ? error.message : "Enregistrement impossible");
              }
            });
          }}
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}
