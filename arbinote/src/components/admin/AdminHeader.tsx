'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import FederationSwitcher from '../FederationSwitcher'
import { useAdminSidebar } from './AdminSidebarContext'

export default function AdminHeader() {
  const { toggleSidebar } = useAdminSidebar()
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
    <header className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Bouton menu mobile */}
          <button
            onClick={toggleSidebar}
            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Menu"
          >
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div>
            <p className="text-xs sm:text-sm text-gray-500">Espace d'administration</p>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900">Gestion des arbitres</h1>
          </div>
        </div>
        <div className="flex-shrink-0 flex items-center gap-3">
          <FederationSwitcher variant="admin" />
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-sm font-medium text-gray-600 hover:text-red-600 border border-gray-300 hover:border-red-300 rounded-md px-3 py-1.5 transition-colors disabled:opacity-60"
          >
            {loggingOut ? 'Déconnexion...' : 'Déconnexion'}
          </button>
        </div>
      </div>
    </header>
  )
}
