'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import AdminAlertsBadge from './AdminAlertsBadge'
import { useAdminSidebar } from './AdminSidebarContext'

const navItems = [
  { label: 'Votes', href: '/admin/votes', icon: '🗳️' },
  { label: 'Critères', href: '/admin/criteres', icon: '📋' },
  { label: 'Anomalies', href: '/admin/anomalies', icon: '⚠️' },
  { label: 'Alertes', href: '/admin/alerts', icon: '🔔' },
  { label: 'Messages', href: '/admin/contact', icon: '✉️' },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const { isOpen, isCollapsed, toggleCollapse, closeSidebar } = useAdminSidebar()

  return (
    <>
      {/* Overlay pour mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800
          transform transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${isCollapsed ? 'lg:w-16' : 'w-64'}
        `}
      >
        {/* Header */}
        <div className="p-4 lg:p-6 flex items-center justify-between border-b border-slate-800">
          {!isCollapsed && (
            <span className="text-lg lg:text-xl font-bold tracking-tight">ARBINOTE</span>
          )}
          {isCollapsed && (
            <span className="text-lg font-bold mx-auto">A</span>
          )}
          {/* Bouton collapse pour desktop */}
          <button
            onClick={toggleCollapse}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded hover:bg-slate-800 transition-colors"
            title={isCollapsed ? 'Ouvrir' : 'Réduire'}
          >
            <svg
              className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
          {/* Bouton fermer pour mobile */}
          <button
            onClick={closeSidebar}
            className="lg:hidden flex items-center justify-center w-8 h-8 rounded hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 lg:p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const linkPath = item.href.split('#')[0]
            const isActive = pathname === linkPath
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeSidebar}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${isActive ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                  ${isCollapsed ? 'lg:justify-center lg:px-2' : ''}
                `}
                title={isCollapsed ? item.label : undefined}
              >
                <span className="text-base">{item.icon}</span>
                {!isCollapsed && <span className="flex-1">{item.label}</span>}
                {item.href === '/admin/alerts' && !isCollapsed && <AdminAlertsBadge />}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800">
          {!isCollapsed && (
            <p className="text-xs text-slate-500">ARBINOTE © {new Date().getFullYear()}</p>
          )}
        </div>
      </aside>
    </>
  )
}
