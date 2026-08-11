"use client";

import { useState } from "react";

export interface NotificationPrefsValues {
  matches: boolean;
  results: boolean;
  news: boolean;
  womenTeam: boolean;
  youth: boolean;
  favoritePlayers: boolean;
  shop: boolean;
  ticketing: boolean;
}

const OPTIONS: { key: keyof NotificationPrefsValues; label: string }[] = [
  { key: "matches", label: "Matchs" },
  { key: "results", label: "Résultats" },
  { key: "news", label: "Actualités" },
  { key: "womenTeam", label: "Équipe féminine" },
  { key: "youth", label: "Jeunes" },
  { key: "favoritePlayers", label: "Joueurs favoris" },
  { key: "shop", label: "Boutique" },
  { key: "ticketing", label: "Billetterie" },
];

export function NotificationPrefsForm({ initial }: { initial: NotificationPrefsValues }) {
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(false);

  async function toggle(key: keyof NotificationPrefsValues) {
    const next = { ...values, [key]: !values[key] };
    setValues(next);
    setSaved(false);
    const response = await fetch("/api/notifications/prefs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: next[key] }),
    });
    if (response.ok) setSaved(true);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {OPTIONS.map((option) => (
        <label key={option.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={values[option.key]} onChange={() => toggle(option.key)} />
          {option.label}
        </label>
      ))}
      {saved && <span style={{ fontSize: 12, color: "var(--ob-win-text)" }}>Préférences enregistrées.</span>}
    </div>
  );
}
