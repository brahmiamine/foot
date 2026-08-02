'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import FederationSwitcher from '../FederationSwitcher'
import { useAdminSidebar } from './AdminSidebarContext'

export default function AdminHeader() {
  const { toggleSidebar, toggleCollapse, isCollapsed } = useAdminSidebar()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
    } finally {
      router.push('/login')
      router.refresh()
    }
  }

  return (
    <header id="page-topbar">
      <div className="navbar-header">
        <div className="d-flex align-items-center">
          <button
            type="button"
            onClick={toggleSidebar}
            className="btn btn-sm px-3 header-item d-lg-none"
            aria-label="Ouvrir le menu"
          >
            <i className="bx bx-menu fs-4" />
          </button>

          <button
            type="button"
            onClick={toggleCollapse}
            className="btn btn-sm px-3 header-item d-none d-lg-inline-flex"
            aria-label={isCollapsed ? 'Ouvrir le menu' : 'Réduire le menu'}
          >
            <i className={`bx fs-4 ${isCollapsed ? 'bx-menu-alt-right' : 'bx-menu-alt-left'}`} />
          </button>

          <div className="ms-2">
            <p className="text-muted mb-0 small">Espace d&apos;administration</p>
            <h1 className="h5 mb-0">Administration générale</h1>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <FederationSwitcher variant="admin" />
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="btn btn-sm btn-outline-danger"
          >
            {loggingOut ? 'Déconnexion...' : 'Déconnexion'}
          </button>
        </div>
      </div>
    </header>
  )
}
