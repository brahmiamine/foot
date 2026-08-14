"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { markResolvedAction } from "@/app/actions";

export function MarkResolvedButton({ injuryId }: { injuryId: number }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Button
      variant="primary"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const actualReturnDate = prompt("Date de retour effectif :", today);
          if (!actualReturnDate) return;
          await markResolvedAction(injuryId, actualReturnDate);
          router.refresh();
        })
      }
    >
      Marquer comme résolue
    </Button>
  );
}
