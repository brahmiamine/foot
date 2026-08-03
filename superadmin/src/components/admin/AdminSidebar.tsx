'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAdminSidebar } from './AdminSidebarContext'

const navItems = [
  { label: 'Tableau de bord', href: '/admin', icon: 'bx bx-home-circle' },
  { label: 'Fédérations', href: '/admin/federations', icon: 'bx bx-buildings' },
  { label: 'Ligues', href: '/admin/leagues', icon: 'bx bx-trophy' },
  { label: 'Saisons', href: '/admin/saisons', icon: 'bx bx-calendar-event' },
  { label: 'Journées', href: '/admin/journees', icon: 'bx bx-calendar' },
  { label: 'Équipes', href: '/admin/teams', icon: 'bx bx-group' },
  { label: 'Clubs', href: '/admin/club', icon: 'bx bx-shield-quarter' },
  { label: 'Matchs', href: '/admin/matches', icon: 'bx bx-football' },
  { label: 'Arbitres', href: '/admin/arbitres', icon: 'bx bx-user-check' },
  { label: 'Motifs de carton', href: '/admin/card-reasons', icon: 'bx bx-note' },
  { label: "Journal d'audit", href: '/admin/audit', icon: 'bx bx-notepad' },
  { label: 'Test API-Football', href: '/admin/testapi', icon: 'bx bx-test-tube' },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const { isOpen, isCollapsed, toggleCollapse, closeSidebar } = useAdminSidebar()

  return (
    <>
      {isOpen && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark opacity-50 d-lg-none"
          style={{ zIndex: 1000 }}
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <div className="vertical-menu">
        <div className="navbar-brand-box">
          <Link href="/admin" className="logo logo-dark">
            <span className="logo-sm fw-bold fs-5">SA</span>
            <span className="logo-lg fw-semibold fs-5">SuperAdmin</span>
          </Link>
        </div>

        <div className="h-100" data-simplebar>
          <div id="sidebar-menu">
            <ul className="metismenu list-unstyled" id="side-menu">
              <li className="menu-title">Navigation</li>
              {navItems.map((item) => {
                const linkPath = item.href.split('#')[0]
                const isActive = pathname === linkPath
                return (
                  <li key={item.href} className={isActive ? 'mm-active' : undefined}>
                    <Link
                      href={item.href}
                      className={isActive ? 'active' : undefined}
                      onClick={closeSidebar}
                    >
                      <i className={item.icon} />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        <div className="px-4 py-2 border-top d-none d-lg-flex align-items-center justify-content-between small text-muted">
          <span>{new Date().getFullYear()} SuperAdmin</span>
          <button
            type="button"
            onClick={toggleCollapse}
            className="btn btn-sm btn-soft-primary"
            title={isCollapsed ? 'Ouvrir le menu' : 'Réduire le menu'}
          >
            <i className={`bx ${isCollapsed ? 'bx-chevrons-right' : 'bx-chevrons-left'}`} />
          </button>
        </div>
      </div>
    </>
  )
}
