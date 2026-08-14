"use client";

import { useI18n } from "@/i18n/provider";
import { useState, type CSSProperties, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import type { ClubBranding } from "@/lib/clubBranding";

export function DashboardShell({
  sellerName,
  sellerStatus,
  userName,
  clubBranding,
  children,
}: {
  sellerName: string;
  sellerStatus: string;
  userName: string;
  clubBranding: ClubBranding;
  children: ReactNode;
}) {
  useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Couleurs du club connecté injectées comme variables CSS scopées à ce
  // wrapper : elles écrasent les valeurs par défaut de globals.css pour
  // tout le tableau de bord sans affecter les pages publiques (login/
  // register), qui restent sur le thème générique.
  const brandingVars = {
    "--sp-primary": clubBranding.primaryColor,
    "--sp-sidebar-bg": clubBranding.secondaryColor,
    "--sp-accent": clubBranding.accentColor,
  } as CSSProperties;

  return (
    <div style={{ display: "flex", minHeight: "100vh", ...brandingVars }}>
      <style>{`
        @media (max-width: 900px) {
          .sp-sidebar-wrap { position: fixed; inset: 0 auto 0 0; transform: translateX(-100%); transition: transform 0.2s ease; z-index: 40; }
          .sp-sidebar-wrap.open { transform: translateX(0); }
          .sp-menu-toggle { display: inline-flex !important; }
          .sp-overlay { display: block !important; }
        }
      `}</style>

      <div className={`sp-sidebar-wrap${mobileOpen ? " open" : ""}`}>
        <Sidebar clubName={clubBranding.name} clubLogoUrl={clubBranding.logoUrl} />
      </div>

      {mobileOpen && (
        <div
          className="sp-overlay"
          onClick={() => setMobileOpen(false)}
          style={{ display: "none", position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 30 }}
        />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <Topbar
          sellerName={sellerName}
          sellerStatus={sellerStatus}
          userName={userName}
          onToggleMenu={() => setMobileOpen((v) => !v)}
        />
        <main style={{ padding: "1.5rem", maxWidth: 1280, margin: "0 auto" }}>{children}</main>
      </div>
    </div>
  );
}
