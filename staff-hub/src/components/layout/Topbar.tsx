"use client";

import Link from "next/link";

export function Topbar({
  userName,
  roleLabel,
  onToggleMenu,
}: {
  userName: string;
  roleLabel: string;
  onToggleMenu?: () => void;
}) {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "var(--sh-surface)",
        borderBottom: "1px solid var(--sh-border)",
        padding: "0.85rem 1.25rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={onToggleMenu}
          aria-label="Menu"
          className="sh-menu-toggle"
          style={{
            background: "none",
            border: "1px solid var(--sh-border)",
            borderRadius: 6,
            padding: "0.35rem 0.55rem",
            cursor: "pointer",
            display: "none",
          }}
        >
          ☰
        </button>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{userName}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--sh-text-muted)" }}>{roleLabel}</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Link href="/notifications" aria-label="Notifications" style={{ fontSize: "1.1rem" }}>
          🔔
        </Link>
        <form method="POST" action="/api/logout">
          <button
            type="submit"
            style={{
              background: "var(--sh-surface-alt)",
              border: "1px solid var(--sh-border)",
              borderRadius: "var(--sh-radius-sm)",
              padding: "0.5rem 0.9rem",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Déconnexion
          </button>
        </form>
      </div>
    </header>
  );
}
