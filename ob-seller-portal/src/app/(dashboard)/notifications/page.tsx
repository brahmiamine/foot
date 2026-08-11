"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { formatDateTime } from "@/lib/format";
import { api, ApiError } from "@/lib/apiClient";

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, string> = {
  PRODUCT_APPROVED: "✅",
  PRODUCT_REJECTED: "⛔",
  NEW_ORDER: "🛒",
  ORDER_CANCELLED: "✖",
  RETURN_REQUESTED: "↺",
  PAYOUT_PAID: "💶",
  ACCOUNT_SUSPENDED: "⚠",
};

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api
      .get<{ items: NotificationRow[] }>("/api/notifications")
      .then((res) => {
        setItems(res.items);
        setError(null);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Erreur de chargement."));
  }

  useEffect(load, []);

  async function markRead(id: string) {
    await api.post(`/api/notifications/${id}/read`);
    load();
  }

  async function markAllRead() {
    await api.post("/api/notifications/read-all");
    load();
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.3rem", margin: 0 }}>Notifications</h1>
        {items && items.some((n) => !n.isRead) && (
          <Button variant="ghost" onClick={markAllRead}>
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {!error && !items && <LoadingState />}
      {items && items.length === 0 && <EmptyState title="Aucune notification" />}

      {items && items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((n) => (
            <Card
              key={n.id}
              style={{ display: "flex", gap: 12, alignItems: "flex-start", background: n.isRead ? "var(--sp-surface)" : "var(--sp-primary-soft)", cursor: n.isRead ? "default" : "pointer" }}
            >
              <span style={{ fontSize: "1.1rem" }} onClick={() => !n.isRead && markRead(n.id)}>
                {TYPE_ICON[n.type] ?? "🔔"}
              </span>
              <div onClick={() => !n.isRead && markRead(n.id)} style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>{n.title}</div>
                <div style={{ fontSize: "0.83rem", color: "var(--sp-text-muted)", marginTop: 2 }}>{n.message}</div>
                <div style={{ fontSize: "0.72rem", color: "var(--sp-text-subtle)", marginTop: 6 }}>{formatDateTime(n.createdAt)}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
