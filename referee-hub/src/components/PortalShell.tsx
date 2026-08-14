"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { FiCalendar, FiClock, FiFileText, FiGlobe, FiHome, FiLogOut, FiMenu, FiShield, FiSlash, FiUser, FiX } from "react-icons/fi";
import type { Locale } from "@/lib/i18n";
import type { RequestSession } from "@/lib/requestSession";

interface ShellLabels {
  dashboard: string;
  assignments: string;
  reports: string;
  availability: string;
  history: string;
  profile: string;
  logout: string;
  portal: string;
  privateSpace: string;
}

export function PortalShell({
  children,
  session,
  locale,
  labels,
}: {
  children: React.ReactNode;
  session: RequestSession;
  locale: Locale;
  labels: ShellLabels;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const nav = [
    { href: "/", label: labels.dashboard, icon: FiHome },
    { href: "/assignments", label: labels.assignments, icon: FiCalendar },
    { href: "/reports", label: labels.reports, icon: FiFileText },
    { href: "/availability", label: labels.availability, icon: FiSlash },
    { href: "/history", label: labels.history, icon: FiClock },
    { href: "/profile", label: labels.profile, icon: FiUser },
  ];

  async function switchLocale() {
    await fetch("/api/locale", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale: locale === "fr" ? "ar" : "fr" }),
    });
    router.refresh();
  }

  return (
    <div className="portal-shell" dir={locale === "ar" ? "rtl" : "ltr"}>
      {open && <button className="sidebar-backdrop" aria-label="Fermer le menu" onClick={() => setOpen(false)} />}
      <aside className={`portal-sidebar ${open ? "is-open" : ""}`}>
        <div className="brand-block">
          <div className="brand-mark">RH</div>
          <div>
            <strong>{labels.portal}</strong>
            <small>{labels.privateSpace}</small>
          </div>
          <button className="sidebar-close d-lg-none" onClick={() => setOpen(false)} aria-label="Fermer">
            <FiX />
          </button>
        </div>
        <nav className="portal-nav" aria-label="Navigation principale">
          {nav.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={active ? "active" : ""} onClick={() => setOpen(false)}>
                <Icon aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-security">
          <FiShield aria-hidden="true" />
          <span>{locale === "ar" ? "بيانات رسمية ومحمية" : "Données officielles protégées"}</span>
        </div>
      </aside>

      <div className="portal-content">
        <header className="portal-header">
          <div className="d-flex align-items-center gap-3 min-w-0">
            <button className="icon-button d-lg-none" onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
              <FiMenu />
            </button>
            <div className="header-identity min-w-0">
              <span>{locale === "ar" ? "مرحباً" : "Bonjour"}</span>
              <strong>{session.name}</strong>
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button className="header-action" onClick={switchLocale} aria-label="Changer de langue">
              <FiGlobe />
              <span className="d-none d-sm-inline">{locale === "fr" ? "العربية" : "Français"}</span>
            </button>
            <button className="header-action danger" onClick={() => { window.location.href = "/api/logout"; }}>
              <FiLogOut />
              <span className="d-none d-sm-inline">{labels.logout}</span>
            </button>
          </div>
        </header>
        <main className="portal-main">{children}</main>
      </div>
    </div>
  );
}
