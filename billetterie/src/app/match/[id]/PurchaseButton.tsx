"use client";

import { useState } from "react";

interface PurchaseButtonProps {
  matchId: string;
  matchTicketCategoryId: string;
  isAuthenticated: boolean;
  loginUrl: string;
  disabled: boolean;
}

export default function PurchaseButton({ matchId, matchTicketCategoryId, isAuthenticated, loginUrl, disabled }: PurchaseButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  if (reference) {
    return <p style={{ color: "#22c55e", fontSize: "0.85rem", margin: 0 }}>Billet acheté — référence {reference}</p>;
  }

  if (!isAuthenticated) {
    return (
      <a href={loginUrl} className="tk-button" style={{ display: "inline-block", textDecoration: "none" }}>
        Se connecter pour acheter
      </a>
    );
  }

  async function handlePurchase() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/match/${matchId}/purchase`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchTicketCategoryId }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.error ?? "Achat impossible.");
        return;
      }
      setReference(body.ticket.reference);
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button type="button" className="tk-button" disabled={disabled || loading} onClick={handlePurchase}>
        {loading ? "Achat en cours…" : "Acheter"}
      </button>
      {error && <p className="tk-error">{error}</p>}
    </div>
  );
}
