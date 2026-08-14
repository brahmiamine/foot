"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/Field";
import { createStatAction } from "@/app/actions";

interface RosterOption {
  id: string;
  label: string;
}

export function CreateStatForm({ roster }: { roster: RosterOption[] }) {
  const [open, setOpen] = useState(false);
  const [playerId, setPlayerId] = useState(roster[0]?.id ?? "");
  const [season, setSeason] = useState("");
  const [minutesPlayed, setMinutesPlayed] = useState(0);
  const [goals, setGoals] = useState(0);
  const [assists, setAssists] = useState(0);
  const [yellowCards, setYellowCards] = useState(0);
  const [redCards, setRedCards] = useState(0);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!open) {
    return (
      <Button variant="primary" onClick={() => setOpen(true)} disabled={roster.length === 0}>
        + Saisir des statistiques
      </Button>
    );
  }

  function submit() {
    if (!playerId) return;
    startTransition(async () => {
      await createStatAction({ playerId, season: season || undefined, minutesPlayed, goals, assists, yellowCards, redCards });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div style={{ border: "1px solid var(--sh-border)", borderRadius: "var(--sh-radius-lg)", padding: "1.25rem", background: "var(--sh-surface)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        <FormField label="Joueur">
          <Select value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
            {roster.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Saison">
          <Input value={season} onChange={(e) => setSeason(e.target.value)} placeholder="2025-2026" />
        </FormField>
        <FormField label="Minutes jouées">
          <Input type="number" min={0} value={minutesPlayed} onChange={(e) => setMinutesPlayed(Number(e.target.value))} />
        </FormField>
        <FormField label="Buts">
          <Input type="number" min={0} value={goals} onChange={(e) => setGoals(Number(e.target.value))} />
        </FormField>
        <FormField label="Passes décisives">
          <Input type="number" min={0} value={assists} onChange={(e) => setAssists(Number(e.target.value))} />
        </FormField>
        <FormField label="Cartons jaunes">
          <Input type="number" min={0} value={yellowCards} onChange={(e) => setYellowCards(Number(e.target.value))} />
        </FormField>
        <FormField label="Cartons rouges">
          <Input type="number" min={0} value={redCards} onChange={(e) => setRedCards(Number(e.target.value))} />
        </FormField>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Button variant="primary" disabled={pending || !playerId} onClick={submit}>
          {pending ? "…" : "Enregistrer"}
        </Button>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
