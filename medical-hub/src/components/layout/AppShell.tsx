"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import type { ClubBranding } from "@/lib/clubBranding";
import type { ClientAccess } from "@/lib/access-client";

const ROLE_LABEL: Record<string, string> = { ADMIN: "Administrateur du club", OBSERVATEUR: "Membre du staff" };

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

  const brandingVars = {
    "--mh-primary": clubBranding.primaryColor,
    "--mh-sidebar-bg": clubBranding.secondaryColor,
    "--mh-accent": clubBranding.accentColor,
  } as CSSProperties;

  return (
    <div style={{ display: "flex", minHeight: "100vh", ...brandingVars }}>
      <style>{`
        @media (max-width: 900px) {
          .mh-sidebar-wrap { position: fixed; inset: 0 auto 0 0; transform: translateX(-100%); transition: transform 0.2s ease; z-index: 40; }
          .mh-sidebar-wrap.open { transform: translateX(0); }
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
        <Topbar userName={userName} roleLabel={ROLE_LABEL[role] ?? role} onToggleMenu={() => setMobileOpen((v) => !v)} />
        <main style={{ padding: "1.5rem", maxWidth: 1280, margin: "0 auto" }}>{children}</main>
      </div>
    </div>
  );
}
