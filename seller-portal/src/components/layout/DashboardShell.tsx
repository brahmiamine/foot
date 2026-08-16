"use client";

import { useI18n } from "@/i18n/provider";
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

const shell = createShellClassNames("sp");
const responsiveCss = createResponsiveShellCss("sp");

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
  const brandingVars = createBrandingVariables("sp", clubBranding) as CSSProperties;

  return (
    <div style={{ display: "flex", minHeight: "100dvh", width: "100%", minWidth: 0, ...brandingVars }}>
      <style>{responsiveCss}</style>

      <div className={`${shell.sidebarWrap}${mobileOpen ? " open" : ""}`}>
        <Sidebar clubName={clubBranding.name} clubLogoUrl={clubBranding.logoUrl} />
      </div>

      {mobileOpen && (
        <div
          className={shell.overlay}
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
          style={{ display: "none", position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 30 }}
        />
      )}

      <div style={{ flex: 1, minWidth: 0, maxWidth: "100%" }}>
        <Topbar
          sellerName={sellerName}
          sellerStatus={sellerStatus}
          userName={userName}
          onToggleMenu={() => setMobileOpen((value) => !value)}
        />
        <main style={{ ...DEFAULT_SHELL_CONTENT }}>{children}</main>
      </div>
    </div>
  );
}
