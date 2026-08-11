"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function DashboardShell({
  sellerName,
  sellerStatus,
  userName,
  children,
}: {
  sellerName: string;
  sellerStatus: string;
  userName: string;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <style>{`
        @media (max-width: 900px) {
          .sp-sidebar-wrap { position: fixed; inset: 0 auto 0 0; transform: translateX(-100%); transition: transform 0.2s ease; z-index: 40; }
          .sp-sidebar-wrap.open { transform: translateX(0); }
          .sp-menu-toggle { display: inline-flex !important; }
          .sp-overlay { display: block !important; }
        }
      `}</style>

      <div className={`sp-sidebar-wrap${mobileOpen ? " open" : ""}`}>
        <Sidebar />
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
