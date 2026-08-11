"use client";

import { FormEvent, useState } from "react";

export function CreateQuizForm() {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);
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
      const response = await fetch("/api/community/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), options: cleanOptions, correctIndex }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Création impossible");

      setSuccess(true);
      setQuestion("");
      setOptions(["", ""]);
      setCorrectIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480 }}>
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
        <label key={index} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="radio" name="correct" checked={correctIndex === index} onChange={() => setCorrectIndex(index)} />
          <span style={{ flex: 1 }}>
            Option {index + 1}
            <input
              type="text"
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              style={{ display: "block", width: "100%" }}
            />
          </span>
        </label>
      ))}

      <button type="button" onClick={() => setOptions((prev) => [...prev, ""])} disabled={options.length >= 6}>
        + Ajouter une option
      </button>

      {error && <p style={{ color: "crimson" }}>{error}</p>}
      {success && <p style={{ color: "green" }}>Quiz créé.</p>}

      <button type="submit" disabled={loading}>
        {loading ? "Création..." : "Créer le quiz"}
      </button>
    </form>
  );
}
