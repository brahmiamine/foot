"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import type { ClubBranding } from "@/lib/clubBranding";

export function AppShell({
  playerName,
  playerNumber,
  userName,
  clubBranding,
  children,
}: {
  playerName: string;
  playerNumber: number;
  userName: string;
  clubBranding: ClubBranding;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Couleurs du club connecté injectées comme variables CSS scopées à ce
  // wrapper : elles écrasent les valeurs par défaut de globals.css pour tout
  // le tableau de bord sans affecter la page de connexion (côté identity).
  const brandingVars = {
    "--ph-primary": clubBranding.primaryColor,
    "--ph-sidebar-bg": clubBranding.secondaryColor,
    "--ph-accent": clubBranding.accentColor,
  } as CSSProperties;

  return (
    <div style={{ display: "flex", minHeight: "100vh", ...brandingVars }}>
      <style>{`
        @media (max-width: 900px) {
          .ph-sidebar-wrap { position: fixed; inset: 0 auto 0 0; transform: translateX(-100%); transition: transform 0.2s ease; z-index: 40; }
          .ph-sidebar-wrap.open { transform: translateX(0); }
          .ph-menu-toggle { display: inline-flex !important; }
          .ph-overlay { display: block !important; }
        }
      `}</style>

      <div className={`ph-sidebar-wrap${mobileOpen ? " open" : ""}`}>
        <Sidebar clubName={clubBranding.name} clubLogoUrl={clubBranding.logoUrl} />
      </div>

      {mobileOpen && (
        <div
          className="ph-overlay"
          onClick={() => setMobileOpen(false)}
          style={{ display: "none", position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 30 }}
        />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <Topbar
          playerName={playerName}
          playerNumber={playerNumber}
          userName={userName}
          onToggleMenu={() => setMobileOpen((v) => !v)}
        />
        <main style={{ padding: "1.5rem", maxWidth: 1280, margin: "0 auto" }}>{children}</main>
      </div>
    </div>
  );
}
