"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import type { ClubBranding } from "@/lib/clubBranding";
import type { ClientAccess } from "@/lib/access-client";
import { useI18n } from "@/i18n/I18nProvider";
import { getRoleLabelKey } from "@/lib/dashboard";
import {
  DEFAULT_SHELL_CONTENT,
  createBrandingVariables,
  createResponsiveShellCss,
  createShellClassNames,
} from "@foot/app-shell";

const shell = createShellClassNames("mh");
const responsiveCss = createResponsiveShellCss("mh");

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
  const brandingVars = createBrandingVariables("mh", clubBranding) as CSSProperties;

  return (
    <div style={{ display: "flex", minHeight: "100vh", ...brandingVars }}>
      <style>{responsiveCss}</style>

      <div className={`${shell.sidebarWrap}${mobileOpen ? " open" : ""}`}>
        <Sidebar clubName={clubBranding.name} clubLogoUrl={clubBranding.logoUrl} access={access} />
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
          userName={userName}
          roleLabel={roleKey ? t(roleKey) : role}
          onToggleMenu={() => setMobileOpen((value) => !value)}
        />
        <main style={{ ...DEFAULT_SHELL_CONTENT }}>{children}</main>
      </div>
    </div>
  );
}
