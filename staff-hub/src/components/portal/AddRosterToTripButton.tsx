"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { addRosterToTripAction } from "@/app/actions";

export function AddRosterToTripButton({ tripId }: { tripId: number }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="primary"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const { count } = await addRosterToTripAction(tripId);
          alert(count > 0 ? `${count} joueur(s) ajouté(s).` : "Tout l'effectif est déjà ajouté.");
          router.refresh();
        })
      }
    >
      Ajouter tout l&apos;effectif
    </Button>
  );
}
