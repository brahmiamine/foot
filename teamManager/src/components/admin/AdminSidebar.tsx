"use client";

import { useAdminSidebar } from "./AdminSidebarContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";

/**
 * Admin Sidebar Navigation Component
 * Même structure/couleurs que arbinote/superadmin (sidebar sombre slate-900,
 * Tailwind), avec support des sous-menus et du mode compact desktop
 * (spécifiques à teamManager, qui a plus de sections qu'arbinote).
 */
export function AdminSidebar({ teamName }: { teamName: string }) {
  const { isOpen, isCollapsed, closeSidebar, openSidebar, toggleCollapse } = useAdminSidebar();
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const menuGroups = useMemo(
    () => [
      {
        title: "Dashboards",
        items: [
          { title: "Tableau de bord", icon: "fas fa-home", href: "/admin", children: [] as { title: string; href: string }[] },
        ],
      },
      {
        title: "Apps",
        items: [
          { title: "Stades", icon: "fas fa-building", href: "/admin/stadiums", children: [] },
          {
            title: "Joueurs",
            icon: "fas fa-user-friends",
            href: "/admin/players",
            children: [
              { title: "Liste", href: "/admin/players" },
              { title: "Ajouter", href: "/admin/players/create" },
            ],
          },
          {
            title: "Staff",
            icon: "fas fa-user-friends",
            href: "/admin/staff",
            children: [
              { title: "Liste", href: "/admin/staff" },
              { title: "Ajouter", href: "/admin/staff/create" },
            ],
          },
          { title: "Membres", icon: "fas fa-users", href: "/admin/team-members", children: [] },
          { title: "Matchs", icon: "fas fa-futbol", href: "/admin/matches", children: [] },
          {
            title: "Discipline",
            icon: "fas fa-gavel",
            href: "/admin/cards",
            children: [
              { title: "Cartons", href: "/admin/cards" },
              { title: "Suspensions", href: "/admin/suspensions" },
              { title: "Amendes", href: "/admin/fines" },
              { title: "Notes", href: "/admin/notes" },
              { title: "Journal d'audit", href: "/admin/audit" },
              { title: "Exports", href: "/admin/exports" },
              { title: "Réglages", href: "/admin/settings" },
            ],
          },
          {
            title: "Actualités",
            icon: "fas fa-newspaper",
            href: "/admin/news",
            children: [
              { title: "Liste", href: "/admin/news" },
              { title: "Créer", href: "/admin/news/create" },
            ],
          },
          {
            title: "Médias",
            icon: "fas fa-photo-video",
            href: "/admin/media/items",
            children: [
              { title: "Éléments média", href: "/admin/media/items" },
              { title: "Galeries", href: "/admin/media/galleries" },
            ],
          },
        ],
      },
      {
        title: "Pages",
        items: [
          { title: "Convocations", icon: "fas fa-calendar-check", href: "/admin/convocations", children: [] },
          { title: "Galerie", icon: "fas fa-images", href: "/admin/media/items", children: [] },
          { title: "Classement", icon: "fas fa-trophy", href: "/admin/standings", children: [] },
          {
            title: "Boutique",
            icon: "fas fa-shopping-cart",
            href: "/admin/shop/products",
            children: [
              { title: "Produits", href: "/admin/shop/products" },
              { title: "Catégories", href: "/admin/shop/categories" },
            ],
          },
          { title: "Sponsors", icon: "fas fa-handshake", href: "/admin/sponsors", children: [] },
          { title: "Notifications", icon: "fas fa-bell", href: "/admin/notifications", children: [] },
          { title: "Statistiques", icon: "fas fa-chart-bar", href: "/admin/stats", children: [] },
        ],
      },
    ],
    []
  );

  const menuItems = useMemo(() => menuGroups.flatMap((group) => group.items), [menuGroups]);

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    if (pathname === href) return true;
    return pathname?.startsWith(href + "/");
  };

  const toggleSubmenu = (href: string) => {
    setExpandedItems((prev) => (prev.includes(href) ? prev.filter((item) => item !== href) : [...prev, href]));
  };

  const activeParents = menuItems
    .filter((item) => item.children.length > 0)
    .filter((item) => item.children.some((child) => isActive(child.href)))
    .map((item) => item.href);

  const isExpanded = (href: string) => {
    if (activeParents.includes(href)) return true;
    return expandedItems.includes(href);
  };

  return (
    <>
      {isOpen && <div className="skote-sidebar-overlay d-lg-none" onClick={closeSidebar} aria-hidden="true" />}

      <aside
        className={`
          vertical-menu
          ${isCollapsed ? "vertical-menu-collapsed" : ""}
          ${isOpen ? "vertical-menu-open" : ""}
        `}
        aria-label="Navigation admin"
      >
        <div className="navbar-brand-box">
          <Link href="/admin" className="logo logo-dark" onClick={closeSidebar}>
            <span className="logo-sm fw-bold">TM</span>
            <span className="logo-lg fw-semibold text-truncate">{teamName}</span>
          </Link>
        </div>

        <div className="h-100">
          <div id="sidebar-menu">
            <ul className="metismenu list-unstyled" id="side-menu">
              {menuGroups.map((group) => (
                <li key={group.title}>
                  {!isCollapsed && <div className="menu-title">{group.title}</div>}
                  <ul className="list-unstyled mb-0">
                    {group.items.map((item) => {
                      const active = isActive(item.href);
                      const hasChildren = item.children.length > 0;
                      const hasActiveChild = hasChildren && item.children.some((child) => isActive(child.href));
                      const expanded = hasChildren && isExpanded(item.href);

                      return (
                        <li key={item.href} className={active || hasActiveChild ? "mm-active" : undefined}>
                          <Link
                            href={item.href}
                            className={active ? "active" : undefined}
                            title={isCollapsed ? item.title : undefined}
                            onClick={(e) => {
                              if (hasChildren) {
                                if (!isOpen && isCollapsed) {
                                  e.preventDefault();
                                  openSidebar();
                                  setTimeout(() => toggleSubmenu(item.href), 250);
                                  return;
                                }
                                e.preventDefault();
                                toggleSubmenu(item.href);
                                return;
                              }
                              if (window.innerWidth < 992) closeSidebar();
                            }}
                          >
                            <i className={item.icon} aria-hidden="true" />
                            {!isCollapsed && <span>{item.title}</span>}
                            {hasChildren && !isCollapsed && (
                              <i className={`menu-arrow fas fa-chevron-${expanded ? "up" : "down"}`} aria-hidden="true" />
                            )}
                          </Link>

                          {hasChildren && expanded && !isCollapsed && (
                            <ul className="sub-menu list-unstyled mm-collapse mm-show">
                              {item.children.map((child) => {
                                const childActive = isActive(child.href);
                                return (
                                  <li key={child.href}>
                                    <Link
                                      href={child.href}
                                      className={childActive ? "active" : undefined}
                                      onClick={() => {
                                        if (window.innerWidth < 992) closeSidebar();
                                      }}
                                    >
                                      {child.title}
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="sidebar-footer px-3 py-2 border-top d-flex align-items-center justify-content-between">
          {!isCollapsed && <span className="small text-muted">{new Date().getFullYear()} TeamManager</span>}
          <button
            type="button"
            onClick={toggleCollapse}
            className="btn btn-sm btn-soft-primary d-none d-lg-inline-flex"
            title={isCollapsed ? "Ouvrir le menu" : "Réduire le menu"}
          >
            <i className={`fas ${isCollapsed ? "fa-angle-right" : "fa-angle-left"}`} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={closeSidebar}
            className="btn btn-sm btn-outline-light d-lg-none"
            aria-label="Fermer le menu"
          >
            <i className="fas fa-times" aria-hidden="true" />
          </button>
        </div>
      </aside>
    </>
  );
}
