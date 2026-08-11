"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import shared from "@/components/shared.module.css";
import styles from "../../billetterie.module.css";
import { confirmTicketOrder } from "./actions";
import type { IssuedTicketResult } from "@/services/TicketPurchaseService";

interface OrderItem {
  categoryName: string;
  quantity: number;
  unitPrice: number;
}

function useCountdown(expiresAt: string | null) {
  const [remaining, setRemaining] = useState<number>(0);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  return { remaining, label: `${minutes}:${String(seconds).padStart(2, "0")}` };
}

function TicketQr({ ticket }: { ticket: IssuedTicketResult }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(ticket.token, { width: 220, margin: 1 }).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [ticket.token]);

  return (
    <div className={`${shared.card} ${styles.card}`} style={{ alignItems: "center", textAlign: "center" }}>
      <div className={styles.categoryName}>{ticket.categoryName}</div>
      {dataUrl && <Image src={dataUrl} alt={`QR code du billet ${ticket.ticketNumber}`} width={180} height={180} unoptimized />}
      <div className={styles.categoryPrice}>{ticket.ticketNumber}</div>
    </div>
  );
}

export function CheckoutClient({
  orderId,
  expiresAt,
  items,
  defaultFirstName,
  defaultLastName,
  defaultEmail,
  loggedIn,
}: {
  ticketingEventId: number;
  orderId: number;
  expiresAt: string | null;
  items: OrderItem[];
  defaultFirstName: string;
  defaultLastName: string;
  defaultEmail: string;
  loggedIn: boolean;
}) {
  const { remaining, label } = useCountdown(expiresAt);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{ orderNumber: string; tickets: IssuedTicketResult[] } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result = await confirmTicketOrder(orderId, formData);
      if (result.success) {
        setConfirmation({ orderNumber: result.orderNumber, tickets: result.tickets });
      } else {
        setError(result.error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmation) {
    return (
      <div>
        <p className={shared.sectionSubtitle} style={{ display: "block", marginBottom: 16 }}>
          🎉 Réservation confirmée — commande {confirmation.orderNumber}
        </p>
        <p className={styles.categoryPrice} style={{ marginBottom: 20 }}>
          Conservez vos billets ci-dessous (capture d&apos;écran ou impression) : présentez le QR code à l&apos;entrée du stade.
        </p>
        <div className={styles.grid}>
          {confirmation.tickets.map((t) => (
            <TicketQr key={t.id} ticket={t} />
          ))}
        </div>

        {loggedIn ? (
          <p style={{ marginTop: 24 }}>
            <Link href="/mes-billets" className={shared.btnPrimary}>
              Retrouver mes billets
            </Link>
          </p>
        ) : (
          <div className={`${shared.card}`} style={{ marginTop: 24, padding: 20 }}>
            <p className={styles.categoryName} style={{ marginBottom: 8 }}>
              Créez votre compte OB pour retrouver facilement vos billets
            </p>
            <Link href="/espace-membre" className={shared.btnPrimary}>
              Créer mon compte
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className={`${shared.card}`} style={{ padding: 16, marginBottom: 20 }}>
        {items.map((item, i) => (
          <div key={i} className={styles.categoryRow} style={{ border: "none", padding: "8px 0" }}>
            <div>
              {item.quantity} × {item.categoryName}
            </div>
            <div>{(item.quantity * item.unitPrice).toFixed(3)} DT</div>
          </div>
        ))}
        {expiresAt && (
          <p className={styles.categoryPrice} style={{ marginTop: 8 }}>
            {remaining > 0 ? `Réservation valable encore ${label}` : "Votre réservation a expiré, veuillez recommencer."}
          </p>
        )}
      </div>

      {error && (
        <p className={shared.empty} style={{ color: "var(--ob-red)", marginBottom: 16 }}>
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formRow}>
          <input name="firstName" placeholder="Prénom" required maxLength={100} defaultValue={defaultFirstName} />
          <input name="lastName" placeholder="Nom" required maxLength={100} defaultValue={defaultLastName} />
        </div>
        <input name="email" type="email" placeholder="Email" required defaultValue={defaultEmail} />
        <input name="phone" type="tel" placeholder="Téléphone (optionnel)" maxLength={30} />

        <button type="submit" className={shared.btnPrimary} style={{ alignSelf: "flex-start" }} disabled={submitting || remaining <= 0}>
          {submitting ? "Confirmation..." : "Confirmer ma réservation"}
        </button>
      </form>
    </div>
  );
}
