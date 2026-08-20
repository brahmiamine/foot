"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { cancelTrainingAction, submitTrainingPlanAction, approveTrainingPlanAction } from "@/app/actions";

export function CancelTrainingButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="danger"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          if (!confirm("Annuler cet entraînement ?")) return;
          await cancelTrainingAction(id);
          router.refresh();
        })
      }
      style={{ padding: "0.4rem 0.7rem", fontSize: "0.78rem" }}
    >
      Annuler
    </Button>
  );
}

/** STAFF-003 — soumet un plan brouillon à l'approbation. */
export function SubmitPlanButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="secondary"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await submitTrainingPlanAction(id);
          router.refresh();
        })
      }
      style={{ padding: "0.4rem 0.7rem", fontSize: "0.78rem" }}
    >
      Soumettre le plan
    </Button>
  );
}

/** STAFF-003 — approuve un plan soumis (le proposant ne peut pas approuver son propre plan, refusé côté serveur). */
export function ApprovePlanButton({ id }: { id: number }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="primary"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await approveTrainingPlanAction(id);
          router.refresh();
        })
      }
      style={{ padding: "0.4rem 0.7rem", fontSize: "0.78rem" }}
    >
      Approuver le plan
    </Button>
  );
}
