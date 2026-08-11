"use client";

import { useState } from "react";

export function ReportButton({
  targetType,
  targetId,
  loggedIn,
}: {
  targetType: "POST" | "COMMENT";
  targetId: string | number;
  loggedIn: boolean;
}) {
  const [state, setState] = useState<"idle" | "sent">("idle");
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!loggedIn || loading || state === "sent") return;
    setLoading(true);
    try {
      const response = await fetch("/api/community/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId: String(targetId) }),
      });
      if (response.ok) setState("sent");
    } finally {
      setLoading(false);
    }
  }

  if (!loggedIn) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading || state === "sent"}
      style={{
        background: "none",
        border: "none",
        color: "var(--ob-text-faint)",
        fontSize: 12,
        cursor: state === "sent" ? "default" : "pointer",
        padding: 0,
        marginLeft: 8,
      }}
    >
      {state === "sent" ? "Signalé" : "Signaler"}
    </button>
  );
}
