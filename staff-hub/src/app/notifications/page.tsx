import { fetchNotifications } from "@/lib/notificationApi";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/States";
import { MarkReadButton, MarkAllReadButton } from "@/components/portal/NotificationActions";
import { formatDateTime } from "@/lib/format";

export default async function NotificationsPage() {
  const notifications = await fetchNotifications();
  const hasUnread = notifications.some((n) => !n.readAt);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: "1.2rem", margin: 0 }}>Notifications</h1>
        {hasUnread && <MarkAllReadButton />}
      </div>

      {notifications.length === 0 && <EmptyState title="Aucune notification" />}

      {notifications.map((n) => (
        <Card key={n.id} style={{ background: n.readAt ? "var(--sh-surface)" : "var(--sh-surface-alt)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                {n.title}
                {!n.readAt && <Badge label="Nouveau" tone="info" />}
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--sh-text-muted)", marginTop: 4 }}>{n.body}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--sh-text-subtle)", marginTop: 6 }}>{formatDateTime(n.createdAt)}</div>
            </div>
            {!n.readAt && <MarkReadButton id={n.id} />}
          </div>
        </Card>
      ))}
    </div>
  );
}
