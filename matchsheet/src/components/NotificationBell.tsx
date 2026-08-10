"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

interface PlatformNotificationDto {
  id: number;
  title: string;
  body: string;
  url?: string | null;
  isUrgent: boolean;
  readAt: string | null;
  createdAt: string;
}

/**
 * Cloche de notifications centralisées (in-app), coin fixe opposé au
 * LanguageToggle. Ne s'affiche que si un utilisateur SSO authentifié est
 * fourni (voir layout.tsx : absent sur la page publique "/").
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<PlatformNotificationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread-count");
      if (!res.ok) return;
      const data = await res.json();
      setUnreadCount(data.count ?? 0);
    } catch {
      // silencieux
    }
  }, []);

  useEffect(() => {
    // setTimeout(0) plutôt qu'un appel direct : évite le cascading render
    // que react-hooks/set-state-in-effect signale sur un setState synchrone
    // dans le corps de l'effet, tout en gardant un premier chargement immédiat.
    const timeout = setTimeout(fetchUnreadCount, 0);
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [fetchUnreadCount]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      try {
        const res = await fetch("/api/notifications?limit=10");
        if (res.ok) {
          setNotifications(await res.json());
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const markAllRead = async () => {
    await fetch("/api/notifications/read-all", { method: "POST" });
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
  };

  const markRead = async (id: number) => {
    await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  return (
    <div className="matchsheet-notif-bell" ref={containerRef}>
      <button onClick={toggleOpen} className="matchsheet-notif-bell-btn" aria-label="Notifications">
        <i className="bx bx-bell" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="matchsheet-notif-bell-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="matchsheet-notif-bell-panel">
          <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom">
            <span className="fw-semibold small">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="btn btn-link btn-sm p-0" style={{ fontSize: "0.75rem" }}>
                Tout marquer lu
              </button>
            )}
          </div>

          {loading && <div className="p-3 text-muted small">Chargement...</div>}

          {!loading && notifications.length === 0 && <div className="p-3 text-muted small">Aucune notification</div>}

          {!loading &&
            notifications.map((n) => (
              <div
                key={n.id}
                className="px-3 py-2 border-bottom"
                style={{ background: n.readAt ? "transparent" : "#fef2f2", cursor: n.url ? "pointer" : "default" }}
                onClick={() => {
                  if (!n.readAt) markRead(n.id);
                }}
              >
                {n.url ? (
                  <Link href={n.url} className="text-decoration-none text-body" onClick={() => setOpen(false)}>
                    <p className="mb-1 small fw-semibold">{n.title}</p>
                    <p className="mb-1 small text-muted">{n.body}</p>
                  </Link>
                ) : (
                  <>
                    <p className="mb-1 small fw-semibold">{n.title}</p>
                    <p className="mb-1 small text-muted">{n.body}</p>
                  </>
                )}
                <p className="mb-0 text-muted" style={{ fontSize: "0.7rem" }}>
                  {new Date(n.createdAt).toLocaleString("fr-FR")}
                </p>
              </div>
            ))}

          <div className="px-3 py-2 text-center">
            <Link href="/notification-center" className="small" onClick={() => setOpen(false)}>
              Voir toutes les notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
