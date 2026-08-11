"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import shared from "@/components/shared.module.css";
import styles from "../billetterie.module.css";
import { reserveTickets } from "./actions";

interface CategoryData {
  ticketCategoryId: number;
  name: string;
  nameAr: string | null;
  description: string | null;
  price: number;
  color: string | null;
  available: number;
}

export function TicketSelector({
  ticketingEventId,
  maxTicketsPerOrder,
  categories,
}: {
  ticketingEventId: number;
  maxTicketsPerOrder: number;
  categories: CategoryData[];
}) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalQuantity = useMemo(() => Object.values(quantities).reduce((sum, q) => sum + q, 0), [quantities]);
  const totalPrice = useMemo(
    () => categories.reduce((sum, c) => sum + (quantities[c.ticketCategoryId] ?? 0) * c.price, 0),
    [categories, quantities]
  );

  const setQuantity = (categoryId: number, value: number, available: number) => {
    const clamped = Math.max(0, Math.min(value, available, maxTicketsPerOrder));
    setQuantities((prev) => ({ ...prev, [categoryId]: clamped }));
  };

  const handleReserve = async () => {
    setError(null);
    const items = categories
      .map((c) => ({ ticketCategoryId: c.ticketCategoryId, quantity: quantities[c.ticketCategoryId] ?? 0 }))
      .filter((i) => i.quantity > 0);

    if (items.length === 0) {
      setError("Sélectionnez au moins un billet");
      return;
    }

    setSubmitting(true);
    try {
      const result = await reserveTickets(ticketingEventId, items);
      if (result.success) {
        router.push(`/billetterie/${ticketingEventId}/checkout?order=${result.orderId}`);
      } else {
        setError(result.error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className={styles.categories}>
        {categories.map((c) => {
          const qty = quantities[c.ticketCategoryId] ?? 0;
          return (
            <div key={c.ticketCategoryId} className={styles.categoryRow}>
              <div>
                <div className={styles.categoryName}>
                  {c.color && <span className={styles.categoryColor} style={{ backgroundColor: c.color }} />}
                  {c.name}
                </div>
                {c.description && <div className={styles.categoryPrice}>{c.description}</div>}
                <div className={styles.categoryPrice}>{c.price > 0 ? `${c.price.toFixed(3)} DT` : "Gratuit"}</div>
                <div className={`${styles.categoryAvailable} ${c.available === 0 ? styles.soldOut : ""}`}>
                  {c.available === 0 ? "Épuisé" : `${c.available} place(s) disponible(s)`}
                </div>
              </div>
              <div className={styles.qtyControl}>
                <button type="button" onClick={() => setQuantity(c.ticketCategoryId, qty - 1, c.available)} disabled={qty === 0}>
                  −
                </button>
                <span>{qty}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(c.ticketCategoryId, qty + 1, c.available)}
                  disabled={qty >= c.available || totalQuantity >= maxTicketsPerOrder}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p className={shared.empty} style={{ color: "var(--ob-red)", marginTop: 16 }}>
          {error}
        </p>
      )}

      <div className={styles.summary}>
        <div>
          <strong>{totalQuantity}</strong> billet(s) — <strong>{totalPrice.toFixed(3)} DT</strong>
        </div>
        <button type="button" className={shared.btnPrimary} onClick={handleReserve} disabled={submitting || totalQuantity === 0}>
          {submitting ? "Réservation..." : "Continuer"}
        </button>
      </div>
      <p className={styles.categoryPrice} style={{ marginTop: 12 }}>
        Vos billets sont réservés 10 minutes le temps de finaliser votre commande. Maximum {maxTicketsPerOrder} billets par commande.
      </p>
    </div>
  );
}
