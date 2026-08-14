"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { cancelTrainingAction } from "@/app/actions";

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
