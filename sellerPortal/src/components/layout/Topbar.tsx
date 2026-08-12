"use client";

import { useI18n } from "@/i18n/provider";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { sellerStatusMeta } from "@/lib/statusLabels";
import { api } from "@/lib/apiClient";

export function Topbar({
  sellerName,
  sellerStatus,
  userName,
  onToggleMenu,
}: {
  sellerName: string;
  sellerStatus: string;
  userName: string;
  onToggleMenu?: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const statusMeta = sellerStatusMeta[sellerStatus];
  const statusMetaLabel = statusMeta ? t(statusMeta.key) : sellerStatus;

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await api.post("/api/auth/logout");
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        background: "var(--sp-surface)",
        borderBottom: "1px solid var(--sp-border)",
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
          aria-label={t("seller.topbar.menu")}
          className="sp-menu-toggle"
          style={{ background: "none", border: "1px solid var(--sp-border)", borderRadius: 6, padding: "0.35rem 0.55rem", cursor: "pointer", display: "none" }}
        >
          ☰
        </button>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{sellerName}</div>
          <div style={{ fontSize: "0.75rem", color: "var(--sp-text-muted)" }}>{t("seller.topbar.signedInAs", { name: userName })}</div>
        </div>
        <Badge label={statusMetaLabel} tone={statusMeta?.tone} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Link href="/notifications" aria-label={t("seller.nav.notifications")} style={{ fontSize: "1.1rem" }}>
          🔔
        </Link>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            background: "var(--sp-surface-alt)",
            border: "1px solid var(--sp-border)",
            borderRadius: "var(--sp-radius-sm)",
            padding: "0.5rem 0.9rem",
            fontSize: "0.82rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {loggingOut ? "…" : t("auth.logout")}
        </button>
      </div>
    </header>
  );
}
