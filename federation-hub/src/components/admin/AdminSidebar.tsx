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
  { label: 'Joueurs', href: '/admin/joueurs', icon: 'bx bx-run' },
  { label: 'Clubs', href: '/admin/club', icon: 'bx bx-shield-quarter' },
  { label: 'Matchs', href: '/admin/matches', icon: 'bx bx-football' },
  { label: 'Invitations staff', href: '/admin/staff-invitations', icon: 'bx bx-envelope' },
  { label: 'Clubs affiliés', href: '/admin/clubs-affilies', icon: 'bx bx-link' },
  { label: 'Licences clubs', href: '/admin/club-licensing', icon: 'bx bx-check-shield' },
  { label: 'Licences personnes', href: '/admin/licenses', icon: 'bx bx-id-card' },
  { label: 'Inscriptions joueurs', href: '/admin/registrations', icon: 'bx bx-user-check' },
  { label: 'Engagements', href: '/admin/competition-entries', icon: 'bx bx-list-check' },
  { label: 'Fenêtres de transfert', href: '/admin/transfer-windows', icon: 'bx bx-calendar-check' },
  { label: 'Éligibilité', href: '/admin/eligibility', icon: 'bx bx-shield-quarter' },
  { label: 'Contrats joueurs', href: '/admin/contracts', icon: 'bx bx-file' },
  { label: 'Contrats staff', href: '/admin/staff-contracts', icon: 'bx bx-briefcase' },
  { label: 'Officiels de match', href: '/admin/officiels-matchs', icon: 'bx bx-badge-check' },
  { label: 'Transferts', href: '/admin/player-transfers', icon: 'bx bx-transfer' },
  { label: 'Motifs de carton', href: '/admin/card-reasons', icon: 'bx bx-note' },
  { label: 'Finance · remboursements', href: '/admin/payments/manual-review', icon: 'bx bx-credit-card', platformOnly: true },
  { label: "Journal d'audit", href: '/admin/audit', icon: 'bx bx-notepad' },
  { label: 'Opérations fédérales', href: '/admin/federal-operations', icon: 'bx bx-landmark' },
  { label: 'Politiques réglementaires', href: '/admin/regulatory-policy-center', icon: 'bx bx-cog' },
  { label: 'Configuration effective', href: '/admin/effective-configuration', icon: 'bx bx-slider-alt' },
]

const arbitrationNavItems = [
  { label: 'Arbitres', href: '/admin/arbitres', icon: 'bx bx-user-check' },
  { label: 'Observateurs', href: '/admin/staff-invitations', icon: 'bx bx-id-card' },
  { label: 'Évaluations', href: '/admin/arbitrage/evaluations', icon: 'bx bx-clipboard' },
  { label: 'Rapports arbitres', href: '/admin/arbitrage/rapports', icon: 'bx bx-file' },
  { label: 'Analytics', href: '/admin/arbitrage/evaluations#analytics', icon: 'bx bx-line-chart' },
  { label: 'ArbiNote · Votes', href: '/admin/arbitrage/arbinote/votes', icon: 'bx bx-message-square-check', platformOnly: true },
  { label: 'ArbiNote · Anomalies', href: '/admin/arbitrage/arbinote/anomalies', icon: 'bx bx-error', platformOnly: true },
  { label: 'ArbiNote · Alertes', href: '/admin/arbitrage/arbinote/alerts', icon: 'bx bx-bell', platformOnly: true },
  { label: 'ArbiNote · Signalements', href: '/admin/arbitrage/arbinote/contact', icon: 'bx bx-envelope', platformOnly: true },
  { label: 'ArbiNote · Critères', href: '/admin/arbitrage/arbinote/criteres', icon: 'bx bx-list-check', platformOnly: true },
]

export default function AdminSidebar({ role }: { role?: string }) {
  const pathname = usePathname()
  const { isOpen, isCollapsed, toggleCollapse, closeSidebar } = useAdminSidebar()
  const platformRole = role === 'SUPERADMIN' || role === 'PLATFORM_SUPERADMIN'

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
            <span className="logo-lg fw-semibold fs-5">Federation Hub</span>
          </Link>
        </div>

        <div className="h-100" data-simplebar>
          <div id="sidebar-menu">
            <ul className="metismenu list-unstyled" id="side-menu">
              <li className="menu-title">Navigation</li>
              {(role === 'REFEREE_OBSERVER' ? [] : navItems)
                .filter((item) => !item.platformOnly || platformRole)
                .map((item) => {
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
              <li className="menu-title">Arbitrage</li>
              {arbitrationNavItems
                .filter((item) => {
                  if (role === 'REFEREE_OBSERVER') return item.href === '/admin/arbitrage/evaluations'
                  if (item.platformOnly) return platformRole
                  return true
                })
                .map((item) => {
                  const linkPath = item.href.split('#')[0]
                  const isActive = pathname === linkPath
                  return (
                    <li key={item.href} className={isActive ? 'mm-active' : undefined}>
                      <Link href={item.href} className={isActive ? 'active' : undefined} onClick={closeSidebar}>
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
          <span>{new Date().getFullYear()} Federation Hub</span>
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
