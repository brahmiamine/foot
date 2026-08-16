"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import type { ClubBranding } from "@/lib/clubBranding";
import {
  DEFAULT_SHELL_CONTENT,
  createBrandingVariables,
  createResponsiveShellCss,
  createShellClassNames,
} from "../../../../packages/app-shell/src/index";

const shell = createShellClassNames("ph");
const responsiveCss = createResponsiveShellCss("ph");

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
  const brandingVars = createBrandingVariables("ph", clubBranding) as CSSProperties;

  return (
    <div style={{ display: "flex", minHeight: "100vh", ...brandingVars }}>
      <style>{responsiveCss}</style>

      <div className={`${shell.sidebarWrap}${mobileOpen ? " open" : ""}`}>
        <Sidebar clubName={clubBranding.name} clubLogoUrl={clubBranding.logoUrl} />
      </div>

      {mobileOpen && (
        <div
          className={shell.overlay}
          onClick={() => setMobileOpen(false)}
          style={{ display: "none", position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 30 }}
        />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <Topbar
          playerName={playerName}
          playerNumber={playerNumber}
          userName={userName}
          onToggleMenu={() => setMobileOpen((value) => !value)}
        />
        <main style={{ ...DEFAULT_SHELL_CONTENT }}>{children}</main>
      </div>
    </div>
  );
}
