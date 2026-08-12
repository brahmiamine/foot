"use client";

import { useState, useTransition } from "react";
import type { RemoteNotification } from "@/lib/notificationApi";
import { markNotificationReadAction, markAllNotificationsReadAction } from "@/app/espace-membre/actions";
import shared from "./shared.module.css";
import styles from "./NotificationsList.module.css";
import { useI18n } from "@/i18n/I18nProvider";

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleString(locale === "ar" ? "ar-TN" : "fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function NotificationsList({ initialItems }: { initialItems: RemoteNotification[] }) {
  const { locale, t } = useI18n();
  const [items, setItems] = useState(initialItems);
  const [isPending, startTransition] = useTransition();
  const hasUnread = items.some((item) => !item.readAt);

  const markOneRead = (id: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item)));
    startTransition(async () => {
      await markNotificationReadAction(id);
    });
  };

  const markAllRead = () => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((item) => (item.readAt ? item : { ...item, readAt: now })));
    startTransition(async () => {
      await markAllNotificationsReadAction();
    });
  };

  if (items.length === 0) {
    return (
      <p className={shared.empty}>
        {t("member.notificationsEmpty")}
      </p>
    );
  }

  return (
    <div>
      {hasUnread && (
        <div className={styles.toolbar}>
          <button className={styles.markBtn} onClick={markAllRead} disabled={isPending}>
            {t("member.markAllRead")}
          </button>
        </div>
      )}
      <div className={styles.list}>
        {items.map((item) => (
          <div key={item.id} className={`${shared.card} ${styles.item} ${!item.readAt ? styles.itemUnread : ""}`}>
            <div>
              <p className={styles.title}>{item.title}</p>
              <p className={styles.body}>{item.body}</p>
              <span className={styles.date}>{formatDate(item.createdAt, locale)}</span>
            </div>
            {!item.readAt && (
              <button className={styles.markBtn} onClick={() => markOneRead(item.id)} disabled={isPending}>
                {t("member.markRead")}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
