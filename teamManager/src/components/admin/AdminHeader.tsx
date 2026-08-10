"use client";

import { useTranslations } from "next-intl";
import { useAdminSidebar } from "./AdminSidebarContext";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";

/**
 * Admin Header — même structure qu'arbinote (bg-white, border-b, shadow-sm).
 * Fusionne l'ancien AdminSidebarToggle + LogoutButton.
 */
export function AdminHeader({ userName }: { userName: string }) {
  const { toggleSidebar, toggleCollapse, isCollapsed } = useAdminSidebar();
  const t = useTranslations("admin.layout");

  return (
    <header id="page-topbar">
      <div className="navbar-header">
        <div className="d-flex align-items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="btn btn-sm px-3 header-item d-lg-none"
            aria-label={t("openMenu")}
          >
            <i className="fas fa-bars" aria-hidden="true" />
          </button>
          <button
            onClick={toggleCollapse}
            className="btn btn-sm px-3 header-item d-none d-lg-inline-flex"
            aria-label={isCollapsed ? t("openMenu") : t("collapseMenu")}
          >
            <i className={`fas ${isCollapsed ? "fa-angles-right" : "fa-angles-left"}`} aria-hidden="true" />
          </button>
          <div>
            <p className="text-muted mb-0 small">{t("adminSpace")}</p>
            <h1 className="skote-topbar-title">{t("administration")}</h1>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2 gap-sm-3">
          <LocaleSwitcher />
          {userName && <span className="d-none d-sm-inline text-muted small">{userName}</span>}
          <button
            onClick={() => {
              window.location.href = "/api/logout";
            }}
            className="btn btn-outline-secondary btn-sm"
          >
            <i className="fas fa-sign-out-alt me-2" aria-hidden="true" />
            {t("logout")}
          </button>
        </div>
      </div>
    </header>
  );
}
