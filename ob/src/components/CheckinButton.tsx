"use client";

import { useState } from "react";

export function CheckinButton({ matchId, loggedIn }: { matchId: string; loggedIn: boolean }) {
  const [state, setState] = useState<"idle" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!loggedIn || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/community/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Check-in impossible");
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  }

  if (!loggedIn) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || state === "done"}
        style={{
          background: state === "done" ? "var(--ob-win-bg)" : "var(--ob-red)",
          color: state === "done" ? "var(--ob-win-text)" : "white",
          border: "none",
          borderRadius: 8,
          padding: "8px 18px",
          fontWeight: 600,
          cursor: state === "done" ? "default" : "pointer",
        }}
      >
        {state === "done" ? "✓ Présence enregistrée (+200 points)" : "🏟️ Je suis au stade"}
      </button>
      {error && <p style={{ color: "var(--ob-loss-text)", fontSize: 13 }}>{error}</p>}
    </div>
  );
}
