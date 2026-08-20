"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  recordClearanceAction,
  transitionReturnToPlayAction,
} from "@/app/actions";
import type { ReturnToPlayStage } from "@/entities/Injury";

const LABELS: Record<ReturnToPlayStage, string> = {
  INJURED: "Blessé",
  TREATMENT: "Traitement",
  INDIVIDUAL: "Reprise individuelle",
  PARTIAL: "Reprise partielle groupe",
  FULL: "Entraînement complet",
  CLEARANCE: "Clearance médicale",
  AVAILABLE: "Disponible",
};

const NEXT: Partial<Record<ReturnToPlayStage, ReturnToPlayStage>> = {
  INJURED: "TREATMENT",
  TREATMENT: "INDIVIDUAL",
  INDIVIDUAL: "PARTIAL",
  PARTIAL: "FULL",
  FULL: "CLEARANCE",
};

export function ReturnToPlayPanel({
  injuryId,
  stage,
  clearanceRequired,
  requiredClearances,
  currentClearances,
  canTransition,
  canClearance,
}: {
  injuryId: number;
  stage: ReturnToPlayStage;
  clearanceRequired: boolean;
  requiredClearances: number;
  currentClearances: number;
  canTransition: boolean;
  canClearance: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const next = stage === "FULL" && !clearanceRequired ? "AVAILABLE" : NEXT[stage];

  function run(action: () => Promise<void>, success: string) {
    setMessage(null);
    startTransition(async () => {
      try {
        await action();
        setMessage(success);
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Action impossible");
      }
    });
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <strong style={{ fontSize: "0.9rem" }}>Étape RTP : {LABELS[stage]}</strong>
        {stage === "CLEARANCE" && (
          <span style={{ fontSize: "0.8rem", color: "var(--mh-text-muted)" }}>
            {currentClearances}/{requiredClearances} avis favorable(s)
          </span>
        )}
      </div>

      {message && <div role="status" style={{ fontSize: "0.82rem", color: "var(--mh-text-muted)" }}>{message}</div>}

      {canTransition && next && stage !== "CLEARANCE" && (
        <Button
          variant="primary"
          disabled={pending}
          onClick={() => {
            const note = prompt(`Passage vers « ${LABELS[next]} » — note clinique optionnelle :`) ?? undefined;
            run(
              () => transitionReturnToPlayAction(injuryId, next, note),
              `Étape mise à jour : ${LABELS[next]}.`,
            );
          }}
        >
          Passer à : {LABELS[next]}
        </Button>
      )}

      {canClearance && stage === "CLEARANCE" && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button
            variant="primary"
            disabled={pending}
            onClick={() => {
              const notes = prompt("Commentaire de clearance (optionnel) :") ?? undefined;
              run(
                () => recordClearanceAction(injuryId, "CLEAR", notes),
                "Avis favorable enregistré.",
              );
            }}
          >
            Avis favorable
          </Button>
          <Button
            disabled={pending}
            onClick={() => {
              const notes = prompt("Motif du refus de clearance :");
              if (!notes?.trim()) return;
              run(
                () => recordClearanceAction(injuryId, "NOT_CLEAR", notes),
                "Refus de clearance enregistré.",
              );
            }}
          >
            Refuser la clearance
          </Button>
        </div>
      )}

      {stage === "AVAILABLE" && (
        <span style={{ fontSize: "0.84rem", color: "var(--mh-text-muted)" }}>
          Le protocole Return-to-Play est terminé et le joueur est déclaré disponible.
        </span>
      )}
    </div>
  );
}
