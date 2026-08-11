"use client";

import { FormEvent, useState } from "react";

export interface MatchOption {
  id: string;
  label: string;
}

export interface MatchStatsValues {
  possessionHome: number | null;
  possessionAway: number | null;
  shotsHome: number | null;
  shotsAway: number | null;
  shotsOnTargetHome: number | null;
  shotsOnTargetAway: number | null;
  cornersHome: number | null;
  cornersAway: number | null;
  foulsHome: number | null;
  foulsAway: number | null;
}

const EMPTY_VALUES: MatchStatsValues = {
  possessionHome: null,
  possessionAway: null,
  shotsHome: null,
  shotsAway: null,
  shotsOnTargetHome: null,
  shotsOnTargetAway: null,
  cornersHome: null,
  cornersAway: null,
  foulsHome: null,
  foulsAway: null,
};

const FIELDS: { key: keyof MatchStatsValues; label: string }[] = [
  { key: "possessionHome", label: "Possession domicile (%)" },
  { key: "possessionAway", label: "Possession extérieur (%)" },
  { key: "shotsHome", label: "Tirs domicile" },
  { key: "shotsAway", label: "Tirs extérieur" },
  { key: "shotsOnTargetHome", label: "Tirs cadrés domicile" },
  { key: "shotsOnTargetAway", label: "Tirs cadrés extérieur" },
  { key: "cornersHome", label: "Corners domicile" },
  { key: "cornersAway", label: "Corners extérieur" },
  { key: "foulsHome", label: "Fautes domicile" },
  { key: "foulsAway", label: "Fautes extérieur" },
];

export function MatchStatsForm({
  matches,
  statsByMatch,
}: {
  matches: MatchOption[];
  statsByMatch: Record<string, MatchStatsValues>;
}) {
  const [matchId, setMatchId] = useState(matches[0]?.id ?? "");
  const [values, setValues] = useState<MatchStatsValues>(statsByMatch[matches[0]?.id ?? ""] ?? EMPTY_VALUES);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  function selectMatch(id: string) {
    setMatchId(id);
    setValues(statsByMatch[id] ?? EMPTY_VALUES);
    setSaved(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setSaved(false);
    try {
      const response = await fetch("/api/community/admin/match-stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, ...values }),
      });
      if (response.ok) setSaved(true);
    } finally {
      setLoading(false);
    }
  }

  if (matches.length === 0) {
    return <p>Aucun match disponible.</p>;
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480 }}>
      <label>
        Match
        <select value={matchId} onChange={(e) => selectMatch(e.target.value)} style={{ display: "block", width: "100%" }}>
          {matches.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      {FIELDS.map(({ key, label }) => (
        <label key={key}>
          {label}
          <input
            type="number"
            min={0}
            value={values[key] ?? ""}
            onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value === "" ? null : Number(e.target.value) }))}
            style={{ display: "block", width: "100%" }}
          />
        </label>
      ))}

      {saved && <p style={{ color: "green" }}>Statistiques enregistrées.</p>}
      <button type="submit" disabled={loading}>
        {loading ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}
