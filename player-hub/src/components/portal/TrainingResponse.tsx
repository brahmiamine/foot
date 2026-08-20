"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { respondTrainingAction } from "@/app/actions";
import type { TrainingRsvpStatus } from "@/entities/TrainingInvitation";

const OPTIONS: Array<{ value: Exclude<TrainingRsvpStatus, "PENDING">; label: string }> = [
  { value: "ACCEPTED", label: "Je serai présent" },
  { value: "DECLINED", label: "Je ne serai pas disponible" },
];

export function TrainingResponseButtons({
  invitationId,
  current,
  locked = false,
}: {
  invitationId: number;
  current: TrainingRsvpStatus;
  locked?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function respond(response: Exclude<TrainingRsvpStatus, "PENDING">) {
    setError(null);
    startTransition(async () => {
      const result = await respondTrainingAction(invitationId, response);
      if (!result.success) {
        setError(
          result.error === "response_deadline_passed"
            ? "La date limite de réponse est dépassée."
            : result.error === "cancelled"
              ? "Cette séance a été annulée."
              : "Impossible d'enregistrer la réponse.",
        );
        return;
      }
      router.refresh();
    });
  }

  if (locked) {
    return <div style={{ fontSize: "0.82rem", color: "var(--ph-text-muted)" }}>Réponses clôturées.</div>;
  }

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={current === opt.value ? "primary" : "secondary"}
            disabled={pending}
            onClick={() => respond(opt.value)}
            style={{ padding: "0.4rem 0.7rem", fontSize: "0.78rem" }}
          >
            {opt.label}
          </Button>
        ))}
      </div>
      {error && <div style={{ fontSize: "0.78rem", color: "var(--ph-danger)" }}>{error}</div>}
    </div>
  );
}
