"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { respondTrainingAction } from "@/app/actions";
import type { TrainingInvitationResponse } from "@/entities/TrainingInvitation";

const OPTIONS: Array<{ value: Exclude<TrainingInvitationResponse, "PENDING">; label: string }> = [
  { value: "PRESENT", label: "Présent" },
  { value: "LATE", label: "En retard" },
  { value: "ABSENT", label: "Absent" },
  { value: "INJURED", label: "Blessé" },
];

export function TrainingResponseButtons({
  invitationId,
  current,
}: {
  invitationId: number;
  current: TrainingInvitationResponse;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function respond(response: Exclude<TrainingInvitationResponse, "PENDING">) {
    startTransition(async () => {
      await respondTrainingAction(invitationId, response);
      router.refresh();
    });
  }

  return (
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
  );
}
