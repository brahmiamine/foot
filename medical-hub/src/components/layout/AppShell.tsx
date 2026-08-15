"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import type { ClubBranding } from "@/lib/clubBranding";
import type { ClientAccess } from "@/lib/access-client";
import { useI18n } from "@/i18n/I18nProvider";
import { getRoleLabelKey } from "@/lib/dashboard";

export function AppShell({
  userName,
  role,
  clubBranding,
  access,
  children,
}: {
  userName: string;
  role: string;
  clubBranding: ClubBranding;
  access: ClientAccess;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useI18n();
  const roleKey = getRoleLabelKey(role);
  const brandingVars = {
    "--mh-primary": clubBranding.primaryColor,
    "--mh-sidebar-bg": clubBranding.secondaryColor,
    "--mh-accent": clubBranding.accentColor,
  } as CSSProperties;

  return (
    <div style={{ display: "flex", minHeight: "100vh", ...brandingVars }}>
      <style>{`
        @media (max-width: 900px) {
          .mh-sidebar-wrap {
            position: fixed;
            inset-block: 0;
            inset-inline-start: 0;
            transform: translateX(-100%);
            transition: transform 0.2s ease;
            z-index: 40;
          }
          [dir="rtl"] .mh-sidebar-wrap { transform: translateX(100%); }
          .mh-sidebar-wrap.open,
          [dir="rtl"] .mh-sidebar-wrap.open { transform: translateX(0); }
          .mh-menu-toggle { display: inline-flex !important; }
          .mh-overlay { display: block !important; }
        }
      `}</style>

      <div className={`mh-sidebar-wrap${mobileOpen ? " open" : ""}`}>
        <Sidebar clubName={clubBranding.name} clubLogoUrl={clubBranding.logoUrl} access={access} />
      </div>
      {mobileOpen && (
        <div
          className="mh-overlay"
          onClick={() => setMobileOpen(false)}
          style={{ display: "none", position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 30 }}
        />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Topbar
          userName={userName}
          roleLabel={roleKey ? t(roleKey) : role}
          onToggleMenu={() => setMobileOpen((value) => !value)}
        />
        <main style={{ padding: "1.5rem", maxWidth: 1280, margin: "0 auto" }}>{children}</main>
      </div>
    </div>
  );
}
