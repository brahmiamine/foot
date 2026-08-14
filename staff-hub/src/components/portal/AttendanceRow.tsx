"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { setAttendanceAction } from "@/app/actions";
import type { TrainingInvitationResponse } from "@/entities/TrainingInvitation";

const OPTIONS: Array<{ value: Exclude<TrainingInvitationResponse, "PENDING">; label: string }> = [
  { value: "PRESENT", label: "Présent" },
  { value: "LATE", label: "Retard" },
  { value: "ABSENT", label: "Absent" },
  { value: "INJURED", label: "Blessé" },
];

export function AttendanceRow({ invitationId, current }: { invitationId: number; current: TrainingInvitationResponse }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {OPTIONS.map((opt) => (
        <Button
          key={opt.value}
          variant={current === opt.value ? "primary" : "secondary"}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setAttendanceAction(invitationId, opt.value);
              router.refresh();
            })
          }
          style={{ padding: "0.35rem 0.6rem", fontSize: "0.75rem" }}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}
