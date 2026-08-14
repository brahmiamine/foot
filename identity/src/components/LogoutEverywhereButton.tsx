"use client";

import { useState } from "react";

export default function LogoutEverywhereButton() {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirm("Déconnecter tous les appareils connectés avec ce compte ?")) {
      return;
    }
    setLoading(true);
    try {
      await fetch("/api/logout-everywhere", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      style={{
        background: "none",
        border: "none",
        color: "var(--sso-muted)",
        fontSize: "0.8125rem",
        textDecoration: "underline",
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? "Déconnexion..." : "Se déconnecter de tous les appareils"}
    </button>
  );
}
