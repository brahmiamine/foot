"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { inviteRosterToTrainingAction } from "@/app/actions";

export function InviteRosterButton({ trainingId }: { trainingId: number }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="primary"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const { count } = await inviteRosterToTrainingAction(trainingId);
          alert(count > 0 ? `${count} joueur(s) invité(s).` : "Tout l'effectif est déjà invité.");
          router.refresh();
        })
      }
    >
      Inviter tout l&apos;effectif
    </Button>
  );
}
