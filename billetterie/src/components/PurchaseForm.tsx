"use client";

import { useState } from "react";
import { formatPriceTnd } from "@/lib/format";

export function PurchaseForm({
  matchTicketCategoryId,
  price,
  remaining,
  allowedAudience,
  maxTicketsPerUser,
  saleOpen,
}: {
  matchTicketCategoryId: string;
  price: string;
  remaining: number;
  allowedAudience: "PUBLIC" | "HOME_SUPPORTERS" | "AWAY_SUPPORTERS";
  maxTicketsPerUser: number;
  saleOpen: boolean;
}) {
  const [quantity, setQuantity] = useState(1);
  const [audienceConfirmed, setAudienceConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Renvoyé par /api/tickets quand le profil du membre manque de
  // firstName/lastName/phoneNumber pour payer par Paymee (voir
  // src/lib/errors.ts ProfileIncompleteError) : pointe vers /membre/profil
  // sur `sso`, avec un retour vers cette page une fois complété.
  const [profileUrl, setProfileUrl] = useState<string | null>(null);

  const requiresConfirmation = allowedAudience !== "PUBLIC";
  const maxQuantity = Math.max(1, Math.min(maxTicketsPerUser, remaining));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setProfileUrl(null);
    setLoading(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchTicketCategoryId, quantity, audienceConfirmed }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        if (typeof body?.profileUrl === "string") {
          setProfileUrl(body.profileUrl);
        }
        throw new Error(body?.error ?? `Erreur ${res.status}`);
      }
      if (!body?.payUrl) {
        throw new Error("Réponse inattendue du serveur (lien de paiement manquant).");
      }
      window.location.href = body.payUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Achat impossible.");
      setLoading(false);
    }
  }

  if (!saleOpen) {
    return <p style={{ fontSize: "0.82rem", color: "var(--tk-text-muted)", marginTop: 10 }}>Vente non ouverte pour cette catégorie.</p>;
  }
  if (remaining <= 0) {
    return <p style={{ fontSize: "0.82rem", color: "var(--tk-danger)", marginTop: 10 }}>Complet.</p>;
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
      {error && (
        <div style={{ color: "var(--tk-danger)", fontSize: "0.8rem" }}>
          {error}
          {profileUrl && (
            <>
              {" "}
              <a href={profileUrl} style={{ color: "var(--tk-primary)", textDecoration: "underline" }}>
                Compléter mon profil
              </a>
            </>
          )}
        </div>
      )}
      {requiresConfirmation && (
        <label style={{ fontSize: "0.78rem", display: "flex", gap: 6, alignItems: "flex-start", color: "var(--tk-text-muted)" }}>
          <input
            type="checkbox"
            checked={audienceConfirmed}
            onChange={(e) => setAudienceConfirmed(e.target.checked)}
            style={{ marginTop: 2 }}
          />
          <span>
            Je confirme être{" "}
            {allowedAudience === "HOME_SUPPORTERS" ? "supporter du club recevant" : "supporter du club visiteur"} pour
            cette catégorie.
          </span>
        </label>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="number"
          min={1}
          max={maxQuantity}
          value={quantity}
          onChange={(e) => setQuantity(Math.min(maxQuantity, Math.max(1, parseInt(e.target.value, 10) || 1)))}
          style={{ width: 60, padding: "0.4rem", border: "1px solid var(--tk-border)", borderRadius: 6 }}
        />
        <button
          type="submit"
          disabled={loading || (requiresConfirmation && !audienceConfirmed)}
          style={{
            background: "var(--tk-primary)",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "0.5rem 0.9rem",
            fontWeight: 600,
            cursor: "pointer",
            opacity: loading || (requiresConfirmation && !audienceConfirmed) ? 0.6 : 1,
          }}
        >
          {loading ? "…" : `Acheter — ${formatPriceTnd(price)}`}
        </button>
      </div>
    </form>
  );
}
