"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FormField, Select } from "@/components/ui/Field";
import { createConvocationsAction } from "@/app/actions";
import type { MatchInfo } from "@/services/StaffPortalService";

interface RosterOption {
  id: string;
  label: string;
}

export function CreateConvocationForm({ matches, roster }: { matches: MatchInfo[]; roster: RosterOption[] }) {
  const [open, setOpen] = useState(false);
  const [matchKey, setMatchKey] = useState(matches[0] ? `${matches[0].kind}-${matches[0].id}` : "");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!open) {
    return (
      <Button variant="primary" onClick={() => setOpen(true)} disabled={matches.length === 0}>
        + Convoquer pour un match
      </Button>
    );
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit() {
    if (!matchKey || selected.size === 0) return;
    const [kind, id] = matchKey.split("-", 2) as ["OFFICIAL" | "FRIENDLY", string];
    startTransition(async () => {
      const { count } = await createConvocationsAction(kind, Array.from(selected), kind === "OFFICIAL" ? id : undefined, kind === "FRIENDLY" ? Number(id) : undefined);
      alert(count > 0 ? `${count} joueur(s) convoqué(s).` : "Ces joueurs sont déjà convoqués pour ce match.");
      setOpen(false);
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div style={{ border: "1px solid var(--sh-border)", borderRadius: "var(--sh-radius-lg)", padding: "1.25rem", background: "var(--sh-surface)" }}>
      <FormField label="Match">
        <Select value={matchKey} onChange={(e) => setMatchKey(e.target.value)}>
          {matches.map((m) => (
            <option key={`${m.kind}-${m.id}`} value={`${m.kind}-${m.id}`}>
              {m.isHome ? "vs " : "@ "}
              {m.opponentName}
            </option>
          ))}
        </Select>
      </FormField>

      <div style={{ marginTop: 8, marginBottom: 8, fontSize: "0.82rem", fontWeight: 600 }}>Joueurs ({selected.size} sélectionné(s))</div>
      <div style={{ maxHeight: 240, overflowY: "auto", display: "grid", gap: 4, border: "1px solid var(--sh-border)", borderRadius: "var(--sh-radius-sm)", padding: "0.5rem" }}>
        {roster.map((p) => (
          <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem" }}>
            <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
            {p.label}
          </label>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <Button variant="primary" disabled={pending || !matchKey || selected.size === 0} onClick={submit}>
          {pending ? "…" : "Envoyer les convocations"}
        </Button>
        <Button variant="secondary" onClick={() => setOpen(false)}>
          Annuler
        </Button>
      </div>
    </div>
  );
}
