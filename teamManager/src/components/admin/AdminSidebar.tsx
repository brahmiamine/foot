"use client";

import { useAdminSidebar } from "./AdminSidebarContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

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

  const menuItems = [
    { title: "Dashboard", icon: "fas fa-home", href: "/admin", children: [] as { title: string; href: string }[] },
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
    { title: "Membres", icon: "fas fa-user-friends", href: "/admin/team-members", children: [] },
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
    { title: "Convocations", icon: "fas fa-calendar-check", href: "/admin/convocations", children: [] },
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
    { title: "Galerie", icon: "fas fa-images", href: "/admin/gallery", children: [] },
    { title: "Classement", icon: "fas fa-trophy", href: "/admin/standings", children: [] },
    {
      title: "Boutique",
      icon: "fas fa-shopping-cart",
      href: "/admin/shop",
      children: [
        { title: "Produits", href: "/admin/shop/products" },
        { title: "Commandes", href: "/admin/shop/orders" },
      ],
    },
    { title: "Sponsors", icon: "fas fa-handshake", href: "/admin/sponsors", children: [] },
    { title: "Notifications", icon: "fas fa-bell", href: "/admin/notifications", children: [] },
    { title: "Statistiques", icon: "fas fa-chart-bar", href: "/admin/stats", children: [] },
  ];

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    if (pathname === href) return true;
    return pathname?.startsWith(href + "/");
  };

  const toggleSubmenu = (href: string) => {
    setExpandedItems((prev) => (prev.includes(href) ? prev.filter((item) => item !== href) : [...prev, href]));
  };

  const isExpanded = (href: string) => expandedItems.includes(href);

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={closeSidebar} aria-hidden="true" />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 h-screen
          bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800
          transform transition-all duration-300 ease-in-out overflow-y-auto overflow-x-hidden
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${isCollapsed ? "lg:w-16" : "w-64"}
        `}
        aria-label="Navigation admin"
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-800 min-h-[75px] shrink-0">
          <div className={`flex items-center gap-3 flex-1 ${isCollapsed ? "lg:justify-center" : ""}`}>
            <div className="w-9 h-9 flex items-center justify-center shrink-0">
              <i className="fas fa-shield-alt text-lg" aria-hidden="true" />
            </div>
            {!isCollapsed && (
              <span className="text-lg font-bold tracking-tight truncate">{teamName}</span>
            )}
          </div>
          {/* Bouton collapse desktop */}
          <button
            onClick={toggleCollapse}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded hover:bg-slate-800 transition-colors shrink-0"
            title={isCollapsed ? "Ouvrir" : "Réduire"}
          >
            <i className={`fas fa-chevron-left transition-transform ${isCollapsed ? "rotate-180" : ""}`} aria-hidden="true" />
          </button>
          {/* Bouton fermer mobile */}
          <button
            onClick={closeSidebar}
            className="lg:hidden flex items-center justify-center w-8 h-8 rounded hover:bg-slate-800 transition-colors"
            aria-label="Fermer le menu"
          >
            <i className="fas fa-times" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const active = isActive(item.href);
            const hasChildren = item.children.length > 0;
            const hasActiveChild = hasChildren && item.children.some((child) => isActive(child.href));
            const expanded = hasChildren && (isExpanded(item.href) || hasActiveChild);

            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
                    ${active ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"}
                    ${isCollapsed ? "lg:justify-center lg:px-2" : ""}
                  `}
                  title={isCollapsed ? item.title : undefined}
                  onClick={(e) => {
                    if (hasChildren) {
                      if (!isOpen && isCollapsed) {
                        e.preventDefault();
                        openSidebar();
                        setTimeout(() => toggleSubmenu(item.href), 300);
                        return;
                      }
                      e.preventDefault();
                      toggleSubmenu(item.href);
                    } else if (window.innerWidth < 1024) {
                      closeSidebar();
                    }
                  }}
                >
                  <i className={`${item.icon} w-4 text-center`} aria-hidden="true" />
                  {!isCollapsed && <span className="flex-1">{item.title}</span>}
                  {hasChildren && !isCollapsed && (
                    <i className={`fas fa-chevron-${expanded ? "up" : "down"} text-xs opacity-70`} aria-hidden="true" />
                  )}
                </Link>

                {hasChildren && expanded && !isCollapsed && (
                  <ul className="mt-1 space-y-0.5 bg-black/20 rounded-md py-1">
                    {item.children.map((child) => {
                      const childActive = isActive(child.href);
                      return (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className={`
                              block pl-11 pr-3 py-1.5 rounded-md text-sm transition-colors
                              ${childActive ? "bg-slate-800 text-white" : "text-slate-300/90 hover:bg-slate-800 hover:text-white"}
                            `}
                            onClick={() => {
                              if (window.innerWidth < 1024) closeSidebar();
                            }}
                          >
                            {child.title}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 shrink-0">
          {!isCollapsed && (
            <Link
              href="/"
              className="flex items-center gap-3 text-sm text-slate-300 hover:text-white transition-colors"
            >
              <i className="fas fa-arrow-left" aria-hidden="true" />
              <span>Retour au site</span>
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
