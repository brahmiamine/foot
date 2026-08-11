"use client";

import { useState } from "react";
import shared from "@/components/shared.module.css";
import styles from "./mesBillets.module.css";
import { TicketList } from "./TicketList";
import { lookupGuestTickets } from "./actions";
import type { TicketDisplayInfo } from "./ticketDisplay";

export function GuestLookupForm() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<TicketDisplayInfo[] | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await lookupGuestTickets(orderNumber, email);
      if (result.success) {
        setTickets(result.tickets);
      } else {
        setError(result.error);
        setTickets(null);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="Numéro de commande (ex: OB-XXXX)" required />
        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email utilisé lors de la réservation" required />
        <button type="submit" className={shared.btnPrimary} disabled={loading}>
          {loading ? "Recherche..." : "Retrouver mes billets"}
        </button>
      </form>

      {error && (
        <p className={shared.empty} style={{ color: "var(--ob-red)", marginTop: 16 }}>
          {error}
        </p>
      )}

      {tickets && (
        <div style={{ marginTop: 24 }}>
          <TicketList tickets={tickets} guestEmail={email} />
        </div>
      )}
    </div>
  );
}
