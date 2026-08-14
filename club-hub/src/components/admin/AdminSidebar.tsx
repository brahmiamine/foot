"use client";

import { useAdminSidebar } from "./AdminSidebarContext";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import { canClient, type ClientAccess } from "@/lib/access-client";
import { useI18n } from "@/i18n/I18nProvider";
import type { TranslationKey } from "@/i18n/dictionaries";

const MENU_KEYS: Record<string, TranslationKey> = {
  Dashboards:"navigation.dashboards", "Tableau de bord":"navigation.dashboard", Apps:"navigation.apps", Pages:"navigation.pages", Stades:"navigation.stadiums", Joueurs:"navigation.players", Liste:"navigation.list", Ajouter:"navigation.add", Staff:"navigation.staff", Membres:"navigation.members", Matchs:"navigation.matches", "Matchs amicaux":"navigation.friendlyMatches", Entraînements:"navigation.trainings", Déplacements:"navigation.trips", "Planches tactiques":"navigation.tactics", "Blessures & santé":"navigation.health", Discipline:"navigation.discipline", Cartons:"navigation.cards", Suspensions:"navigation.suspensions", Amendes:"navigation.fines", Notes:"navigation.notes", "Journal d'audit":"navigation.audit", Exports:"navigation.exports", Réglages:"navigation.settings", Actualités:"navigation.news", Créer:"navigation.create", Médias:"navigation.media", "Éléments média":"navigation.mediaItems", Galeries:"navigation.galleries", Convocations:"navigation.callups", Galerie:"navigation.gallery", Boutique:"navigation.shop", Produits:"navigation.products", Catégories:"navigation.categories", Billetterie:"navigation.ticketing", "Par match":"navigation.perMatch", "Catégories de billets":"navigation.ticketCategories", Sponsors:"navigation.sponsors", Communication:"navigation.communication", "Le club":"navigation.club", Présentation:"navigation.presentation", Histoire:"navigation.history", Palmarès:"navigation.honors", "Grandes figures":"navigation.figures", Formation:"navigation.academy", "Contenu éditorial":"navigation.editorial", "Candidatures académie":"navigation.academyApplications", Recrutement:"navigation.recruitment", "Postes recherchés":"navigation.needs", Candidatures:"navigation.applications", Communiqués:"navigation.announcements", "Contact & réseaux":"navigation.contactSocial", "Réseaux sociaux":"navigation.socialNetworks", Coordonnées:"navigation.contactDetails", "Messages reçus":"navigation.receivedMessages", Statistiques:"navigation.statistics", "Stats joueurs":"navigation.playerStats", "Dossier fédéral":"navigation.federation", Conformité:"navigation.compliance", Licences:"navigation.licenses", "Inscriptions joueurs":"navigation.registrations", "Contrats joueurs":"navigation.contracts", "Contrats staff":"navigation.staffContracts", Administration:"admin.header.title", Utilisateurs:"navigation.users", "Rôles & permissions":"navigation.roles"
};

/**
 * Admin Sidebar Navigation Component
 * Même structure/couleurs que arbinote/federation-hub (sidebar sombre, Bootstrap 5
 * + skote-admin.css), avec support des sous-menus et du mode compact desktop
 * (spécifiques à club-hub, qui a plus de sections qu'arbinote). Chaque
 * item peut déclarer une `permission` requise : un compte OBSERVATEUR ne
 * voit que les sections couvertes par ses rôles (ADMIN voit toujours tout).
 */
interface MenuChild {
  title: string;
  href: string;
}

interface MenuItem {
  title: string;
  icon: string;
  href: string;
  children: MenuChild[];
  permission?: string;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

export function AdminSidebar({
  teamName,
  teamLogoUrl,
  access,
}: {
  teamName: string;
  teamLogoUrl?: string | null;
  access: ClientAccess;
}) {
  const { t } = useI18n();
  const label = (value: string) => MENU_KEYS[value] ? t(MENU_KEYS[value]) : value;
  const { isOpen, isCollapsed, closeSidebar, openSidebar, toggleCollapse } = useAdminSidebar();
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const allMenuGroups: MenuGroup[] = useMemo(
    () => [
      {
        title: "Dashboards",
        items: [
          { title: "Tableau de bord", icon: "fas fa-home", href: "/admin", children: [] },
        ],
      },
      {
        title: "Apps",
        items: [
          { title: "Stades", icon: "fas fa-building", href: "/admin/stadiums", children: [], permission: "stadiums.view" },
          {
            title: "Joueurs",
            icon: "fas fa-user-friends",
            href: "/admin/players",
            permission: "players.view",
            children: [
              { title: "Liste", href: "/admin/players" },
              { title: "Ajouter", href: "/admin/players/create" },
            ],
          },
          {
            title: "Staff",
            icon: "fas fa-user-friends",
            href: "/admin/staff",
            permission: "staff.view",
            children: [
              { title: "Liste", href: "/admin/staff" },
              { title: "Ajouter", href: "/admin/staff/create" },
            ],
          },
          { title: "Membres", icon: "fas fa-users", href: "/admin/team-members", children: [], permission: "teamMembers.view" },
          { title: "Matchs", icon: "fas fa-futbol", href: "/admin/matches", children: [], permission: "matches.view" },
          { title: "Matchs amicaux", icon: "fas fa-people-arrows", href: "/admin/friendly-matches", children: [], permission: "friendlyMatches.view" },
          { title: "Entraînements", icon: "fas fa-dumbbell", href: "/admin/trainings", children: [], permission: "trainings.view" },
          { title: "Déplacements", icon: "fas fa-bus", href: "/admin/trips", children: [], permission: "trips.view" },
          { title: "Planches tactiques", icon: "fas fa-chalkboard", href: "/admin/tactics", children: [], permission: "tactics.view" },
          { title: "Blessures & santé", icon: "fas fa-notes-medical", href: "/admin/injuries", children: [], permission: "medical.view" },
          {
            title: "Discipline",
            icon: "fas fa-gavel",
            href: "/admin/cards",
            permission: "discipline.view",
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
            permission: "news.view",
            children: [
              { title: "Liste", href: "/admin/news" },
              { title: "Créer", href: "/admin/news/create" },
            ],
          },
          {
            title: "Médias",
            icon: "fas fa-photo-video",
            href: "/admin/media/items",
            permission: "media.view",
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
          { title: "Convocations", icon: "fas fa-calendar-check", href: "/admin/convocations", children: [], permission: "convocations.view" },
          { title: "Galerie", icon: "fas fa-images", href: "/admin/media/items", children: [], permission: "media.view" },
          {
            title: "Boutique",
            icon: "fas fa-shopping-cart",
            href: "/admin/shop/products",
            permission: "shop.view",
            children: [
              { title: "Produits", href: "/admin/shop/products" },
              { title: "Catégories", href: "/admin/shop/categories" },
              { title: "Commandes", href: "/admin/shop/orders" },
            ],
          },
          {
            title: "Marketplace",
            icon: "fas fa-store",
            href: "/admin/marketplace/products",
            children: [],
            permission: "marketplace.moderate",
          },
          {
            title: "Billetterie",
            icon: "fas fa-ticket",
            href: "/admin/ticketing/matches",
            permission: "ticketing.view",
            children: [
              { title: "Par match", href: "/admin/ticketing/matches" },
              { title: "Catégories de billets", href: "/admin/ticketing/categories" },
            ],
          },
          { title: "Sponsors", icon: "fas fa-handshake", href: "/admin/sponsors", children: [], permission: "sponsors.view" },
          { title: "Communication", icon: "fas fa-bell", href: "/admin/notifications", children: [], permission: "notifications.view" },
          {
            title: "Le club",
            icon: "fas fa-landmark",
            href: "/admin/club",
            permission: "club.view",
            children: [
              { title: "Présentation", href: "/admin/club" },
              { title: "Histoire", href: "/admin/club/history" },
              { title: "Palmarès", href: "/admin/club/honors" },
              { title: "Grandes figures", href: "/admin/club/figures" },
            ],
          },
          {
            title: "Formation",
            icon: "fas fa-graduation-cap",
            href: "/admin/academy",
            permission: "academy.view",
            children: [
              { title: "Catégories", href: "/admin/academy" },
              { title: "Contenu éditorial", href: "/admin/academy/info" },
            ],
          },
          {
            title: "Candidatures académie",
            icon: "fas fa-child",
            href: "/admin/academy/applications",
            children: [],
            permission: "playerApplications.view",
          },
          {
            title: "Recrutement",
            icon: "fas fa-search",
            href: "/admin/recruitment",
            permission: "recruitment.view",
            children: [
              { title: "Postes recherchés", href: "/admin/recruitment" },
              { title: "Candidatures", href: "/admin/recruitment/applications" },
            ],
          },
          { title: "Communiqués", icon: "fas fa-bullhorn", href: "/admin/announcements", children: [], permission: "announcements.view" },
          {
            title: "Contact & réseaux",
            icon: "fas fa-address-book",
            href: "/admin/club-settings",
            permission: "clubSettings.manage",
            children: [
              { title: "Réseaux sociaux", href: "/admin/club-settings" },
              { title: "Coordonnées", href: "/admin/club-settings/contact" },
              { title: "Messages reçus", href: "/admin/club-settings/messages" },
            ],
          },
          { title: "Statistiques", icon: "fas fa-chart-bar", href: "/admin/stats", children: [], permission: "stats.view" },
          { title: "Stats joueurs", icon: "fas fa-chart-line", href: "/admin/player-stats", children: [], permission: "stats.view" },
        ],
      },
      {
        title: "Administration",
        items: [
          { title: "Dossier fédéral", icon: "fas fa-file-shield", href: "/admin/federation/compliance", children: [{ title: "Conformité", href: "/admin/federation/compliance" }, { title: "Licences", href: "/admin/federation/licenses" }, { title: "Inscriptions joueurs", href: "/admin/federation/registrations" }, { title: "Contrats joueurs", href: "/admin/federation/contracts" }, { title: "Contrats staff", href: "/admin/federation/staff-contracts" }] },
          { title: "Utilisateurs", icon: "fas fa-id-badge", href: "/admin/users", children: [], permission: "users.view" },
          { title: "Rôles & permissions", icon: "fas fa-user-shield", href: "/admin/roles", children: [], permission: "roles.manage" },
        ],
      },
    ],
    []
  );

  const menuGroups: MenuGroup[] = useMemo(
    () =>
      allMenuGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => !item.permission || canClient(access, item.permission)),
        }))
        .filter((group) => group.items.length > 0),
    [allMenuGroups, access]
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
        aria-label={t("navigation.admin.label")}
      >
        <div className="navbar-brand-box">
          <Link href="/admin" className="logo logo-dark" onClick={closeSidebar}>
            {teamLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={teamLogoUrl} alt={teamName} className="logo-sm" style={{ height: 24, objectFit: "contain" }} />
            ) : (
              <span className="logo-sm fw-bold">TM</span>
            )}
            <span className="logo-lg fw-semibold text-truncate">{teamName}</span>
          </Link>
        </div>

        <div className="h-100">
          <div id="sidebar-menu">
            <ul className="metismenu list-unstyled" id="side-menu">
              {menuGroups.map((group) => (
                <li key={group.title}>
                  {!isCollapsed && <div className="menu-title">{label(group.title)}</div>}
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
                            title={isCollapsed ? label(item.title) : undefined}
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
                            {!isCollapsed && <span>{label(item.title)}</span>}
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
                                      {label(child.title)}
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
          {!isCollapsed && <span className="small text-muted">{new Date().getFullYear()} Club Hub</span>}
          <button
            type="button"
            onClick={toggleCollapse}
            className="btn btn-sm btn-soft-primary d-none d-lg-inline-flex"
            title={isCollapsed ? t("navigation.menu.open") : t("navigation.menu.collapse")}
          >
            <i className={`fas ${isCollapsed ? "fa-angle-right" : "fa-angle-left"}`} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={closeSidebar}
            className="btn btn-sm btn-outline-light d-lg-none"
            aria-label={t("common.actions.close")}
          >
            <i className="fas fa-times" aria-hidden="true" />
          </button>
        </div>
      </aside>
    </>
  );
}
