"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { respondConvocationAction } from "@/app/actions";
import type { ConvocationResponse } from "@/entities/Convocation";

export function ConvocationResponseButtons({
  convocationId,
  current,
  cancelled,
}: {
  convocationId: number;
  current: ConvocationResponse;
  cancelled: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (cancelled) {
    return <span style={{ color: "var(--ph-text-muted)", fontSize: "0.82rem" }}>Convocation annulée</span>;
  }

  function respond(response: "PRESENT" | "ABSENT") {
    startTransition(async () => {
      await respondConvocationAction(convocationId, response);
      router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <Button
        variant={current === "PRESENT" ? "primary" : "secondary"}
        disabled={pending}
        onClick={() => respond("PRESENT")}
      >
        Je serai présent
      </Button>
      <Button
        variant={current === "ABSENT" ? "danger" : "secondary"}
        disabled={pending}
        onClick={() => respond("ABSENT")}
      >
        Je serai absent
      </Button>
    </div>
  );
}
