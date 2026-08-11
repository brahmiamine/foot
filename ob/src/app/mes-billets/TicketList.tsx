"use client";

import { formatMatchDateTime } from "@/lib/format";
import shared from "@/components/shared.module.css";
import styles from "./mesBillets.module.css";
import type { TicketDisplayInfo } from "./ticketDisplay";

const STATUS_LABEL: Record<TicketDisplayInfo["status"], string> = {
  HELD: "Réservé",
  ISSUED: "Émis",
  USED: "✓ Utilisé",
  CANCELLED: "✕ Annulé",
  EXPIRED: "Expiré",
};

const STATUS_CLASS: Record<TicketDisplayInfo["status"], string> = {
  HELD: styles.statusIssued,
  ISSUED: styles.statusIssued,
  USED: styles.statusUsed,
  CANCELLED: styles.statusCancelled,
  EXPIRED: styles.statusCancelled,
};

export function TicketList({ tickets, guestEmail }: { tickets: TicketDisplayInfo[]; guestEmail?: string }) {
  return (
    <div className={styles.list}>
      {tickets.map((t) => (
        <div key={t.id} className={`${shared.card} ${styles.row}`}>
          <div>
            <div className={styles.match}>{t.matchLabel}</div>
            <div className={styles.meta}>
              {t.matchDate ? formatMatchDateTime(new Date(t.matchDate)) : "Date à confirmer"} · {t.categoryName} · {t.ticketNumber}
            </div>
          </div>
          <div className={styles.actions}>
            <span className={`${styles.status} ${STATUS_CLASS[t.status]}`}>{STATUS_LABEL[t.status]}</span>
            {(t.status === "ISSUED" || t.status === "USED") && (
              <a
                href={`/api/billetterie/tickets/${t.id}/pdf${guestEmail ? `?email=${encodeURIComponent(guestEmail)}` : ""}`}
                className={shared.btnLight}
                target="_blank"
                rel="noreferrer"
              >
                PDF
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
