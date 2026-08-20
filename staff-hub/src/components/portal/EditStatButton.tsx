"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { updateStatAction } from "@/app/actions";

/** STAFF-004 — corrige une statistique ; un motif est demandé une fois la fenêtre de revue écoulée (imposé côté serveur). */
export function EditStatButton({
  id,
  minutesPlayed,
  goals,
  assists,
  yellowCards,
  redCards,
}: {
  id: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function edit() {
    const minutesInput = window.prompt("Minutes jouées :", String(minutesPlayed));
    if (minutesInput === null) return;
    const goalsInput = window.prompt("Buts :", String(goals));
    if (goalsInput === null) return;
    const assistsInput = window.prompt("Passes décisives :", String(assists));
    if (assistsInput === null) return;
    const yellowInput = window.prompt("Cartons jaunes :", String(yellowCards));
    if (yellowInput === null) return;
    const redInput = window.prompt("Cartons rouges :", String(redCards));
    if (redInput === null) return;
    const reason = window.prompt("Motif de la correction (obligatoire si la statistique est verrouillée) :", "") ?? undefined;

    startTransition(async () => {
      await updateStatAction(
        id,
        {
          minutesPlayed: Number(minutesInput),
          goals: Number(goalsInput),
          assists: Number(assistsInput),
          yellowCards: Number(yellowInput),
          redCards: Number(redInput),
        },
        reason,
      );
      router.refresh();
    });
  }

  return (
    <Button variant="secondary" disabled={pending} onClick={edit} style={{ padding: "0.35rem 0.65rem", fontSize: "0.78rem" }}>
      Corriger
    </Button>
  );
}
