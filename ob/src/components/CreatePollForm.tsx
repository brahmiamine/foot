"use client";

import { FormEvent, useState } from "react";

const TYPES: { value: string; label: string }[] = [
  { value: "POLL", label: "Sondage libre" },
  { value: "MOTM", label: "Homme du match" },
  { value: "PLAYER_OF_MONTH", label: "Joueur du mois" },
  { value: "GOAL_OF_MONTH", label: "But du mois" },
];

export function CreatePollForm() {
  const [question, setQuestion] = useState("");
  const [type, setType] = useState("POLL");
  const [options, setOptions] = useState(["", ""]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function updateOption(index: number, value: string) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    const cleanOptions = options.map((o) => o.trim()).filter(Boolean);
    if (!question.trim() || cleanOptions.length < 2) {
      setError("Question et au moins 2 options requises.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/community/polls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), type, options: cleanOptions }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Création impossible");

      setSuccess(true);
      setQuestion("");
      setOptions(["", ""]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480 }}>
      <label>
        Type
        <select value={type} onChange={(e) => setType(e.target.value)} style={{ display: "block", width: "100%" }}>
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Question
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          style={{ display: "block", width: "100%" }}
          required
        />
      </label>

      {options.map((option, index) => (
        <label key={index}>
          Option {index + 1}
          <input
            type="text"
            value={option}
            onChange={(e) => updateOption(index, e.target.value)}
            style={{ display: "block", width: "100%" }}
          />
        </label>
      ))}

      <button type="button" onClick={() => setOptions((prev) => [...prev, ""])} disabled={options.length >= 6}>
        + Ajouter une option
      </button>

      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>Sondage créé.</p>}

      <button type="submit" disabled={loading}>
        {loading ? "Création..." : "Créer le sondage"}
      </button>
    </form>
  );
}
