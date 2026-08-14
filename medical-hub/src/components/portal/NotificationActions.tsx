"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/app/actions";

export function MarkReadButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await markNotificationReadAction(id);
          router.refresh();
        })
      }
      disabled={pending}
      style={{ background: "none", border: "none", color: "var(--mh-primary)", fontWeight: 600, fontSize: "0.78rem", cursor: "pointer" }}
    >
      Marquer comme lu
    </button>
  );
}

export function MarkAllReadButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await markAllNotificationsReadAction();
          router.refresh();
        })
      }
      disabled={pending}
      style={{
        background: "var(--mh-surface-alt)",
        border: "1px solid var(--mh-border)",
        borderRadius: "var(--mh-radius-sm)",
        padding: "0.5rem 0.9rem",
        fontSize: "0.82rem",
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      Tout marquer comme lu
    </button>
  );
}
