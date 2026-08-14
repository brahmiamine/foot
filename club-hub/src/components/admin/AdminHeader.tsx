"use client";

import { useAdminSidebar } from "./AdminSidebarContext";
import { PushSubscribeButton } from "./PushSubscribeButton";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useI18n } from "@/i18n/I18nProvider";

/**
 * Admin Header — même structure qu'arbinote (bg-white, border-b, shadow-sm).
 * Fusionne l'ancien AdminSidebarToggle + LogoutButton.
 */
export function AdminHeader({ userName }: { userName: string }) {
  const { t } = useI18n();
  const { toggleSidebar, toggleCollapse, isCollapsed } = useAdminSidebar();

  return (
    <header id="page-topbar">
      <div className="navbar-header">
        <div className="d-flex align-items-center gap-3">
          <button
            onClick={toggleSidebar}
            className="btn btn-sm px-3 header-item d-lg-none"
            aria-label={t("navigation.menu.open")}
          >
            <i className="fas fa-bars" aria-hidden="true" />
          </button>
          <button
            onClick={toggleCollapse}
            className="btn btn-sm px-3 header-item d-none d-lg-inline-flex"
            aria-label={isCollapsed ? t("navigation.menu.open") : t("navigation.menu.collapse")}
          >
            <i className={`fas ${isCollapsed ? "fa-angles-right" : "fa-angles-left"}`} aria-hidden="true" />
          </button>
          <div>
            <p className="text-muted mb-0 small">{t("admin.header.space")}</p>
            <h1 className="skote-topbar-title">{t("admin.header.title")}</h1>
          </div>
        </div>
        <div className="d-flex align-items-center gap-2 gap-sm-3">
          {userName && <span className="d-none d-sm-inline text-muted small">{userName}</span>}
          <LanguageSwitcher />
          <PushSubscribeButton />
          <form method="POST" action="/api/logout">
            <button type="submit" className="btn btn-outline-secondary btn-sm">
              <i className="fas fa-sign-out-alt me-2" aria-hidden="true" />
              {t("auth.actions.logout")}
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
