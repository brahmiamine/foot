"use client";

import { signOut } from "next-auth/react";
import { useAdminSidebar } from "./AdminSidebarContext";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import type { ResolvedBranding } from "@/lib/branding";

/**
 * Admin Header — même structure qu'arbinote (bg-white, border-b, shadow-sm).
 * Fusionne l'ancien AdminSidebarToggle + LogoutButton. Affiche le logo/nom
 * du club connecté (module "Branding") à côté du bouton de repli sidebar,
 * visible même quand la sidebar est réduite.
 */
export function AdminHeader({ branding, userName }: { branding: ResolvedBranding; userName: string }) {
  const { toggleSidebar, toggleCollapse, isCollapsed } = useAdminSidebar();

  return (
    <header id="page-topbar">
      <div className="navbar-header">
        <div className="d-flex align-items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="btn btn-sm px-3 header-item d-lg-none"
            aria-label="Ouvrir le menu"
          >
            <i className="fas fa-bars" aria-hidden="true" />
          </button>
          <button
            onClick={toggleCollapse}
            className="btn btn-sm px-3 header-item d-none d-lg-inline-flex"
            aria-label={isCollapsed ? "Ouvrir le menu" : "Réduire le menu"}
          >
            <i className={`fas ${isCollapsed ? "fa-angles-right" : "fa-angles-left"}`} aria-hidden="true" />
          </button>
          <div className="d-flex align-items-center gap-2">
            {branding.logoUrl && (
              <ImageWithFallback
                src={branding.logoUrl}
                alt={branding.displayName}
                fallbackIcon="fas fa-shield-alt"
                style={{ width: "32px", height: "32px", objectFit: "contain" }}
              />
            )}
            <div>
              <p className="text-muted mb-0 small">{branding.displayName}</p>
              <h1 className="skote-topbar-title">Administration</h1>
            </div>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2 gap-sm-3">
          {userName && <span className="d-none d-sm-inline text-muted small">{userName}</span>}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="btn btn-outline-secondary btn-sm"
          >
            <i className="fas fa-sign-out-alt me-2" aria-hidden="true" />
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  );
}
