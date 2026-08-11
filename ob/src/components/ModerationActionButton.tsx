"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ModerationActionButton({
  action,
  targetId,
  label,
  variant = "default",
}: {
  action: string;
  targetId: string | number;
  label: string;
  variant?: "default" | "danger";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const response = await fetch("/api/community/admin/moderate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, targetId }),
      });
      if (response.ok) router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      style={{
        background: variant === "danger" ? "#c8102e" : "#2a2a2a",
        color: "white",
        border: "none",
        borderRadius: 6,
        padding: "6px 12px",
        fontSize: 13,
        cursor: "pointer",
        opacity: loading ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  );
}
