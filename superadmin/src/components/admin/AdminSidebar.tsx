'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAdminSidebar } from './AdminSidebarContext'
import { useTranslations } from '@/lib/i18n'

const navItems = [
  { key: 'admin.navigation.dashboard', href: '/admin', icon: 'bx bx-home-circle' },
  { key: 'admin.navigation.federations', href: '/admin/federations', icon: 'bx bx-buildings' },
  { key: 'admin.navigation.leagues', href: '/admin/leagues', icon: 'bx bx-trophy' },
  { key: 'admin.navigation.seasons', href: '/admin/saisons', icon: 'bx bx-calendar-event' },
  { key: 'admin.navigation.matchdays', href: '/admin/journees', icon: 'bx bx-calendar' },
  { key: 'admin.navigation.teams', href: '/admin/teams', icon: 'bx bx-group' },
  { key: 'admin.navigation.clubs', href: '/admin/club', icon: 'bx bx-shield-quarter' },
  { key: 'admin.navigation.matches', href: '/admin/matches', icon: 'bx bx-football' },
  { key: 'admin.navigation.referees', href: '/admin/arbitres', icon: 'bx bx-user-check' },
  { key: 'admin.navigation.cardReasons', href: '/admin/card-reasons', icon: 'bx bx-note' },
  { key: 'admin.navigation.audit', href: '/admin/audit', icon: 'bx bx-notepad' },
]

export default function AdminSidebar() {
  const { t } = useTranslations()
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
              <li className="menu-title">{t('admin.navigation.label')}</li>
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
                      <span>{t(item.key)}</span>
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
            title={t(isCollapsed ? 'common.navigation.open' : 'common.navigation.collapse')}
          >
            <i className={`bx ${isCollapsed ? 'bx-chevrons-right' : 'bx-chevrons-left'}`} />
          </button>
        </div>
      </div>
    </>
  )
}
