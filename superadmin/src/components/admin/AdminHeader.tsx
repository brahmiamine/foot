'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import FederationSwitcher from '../FederationSwitcher'
import { useAdminSidebar } from './AdminSidebarContext'
import LocaleSwitcher from './LocaleSwitcher'
import { useTranslations } from '@/lib/i18n'

export default function AdminHeader() {
  const { t } = useTranslations()
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
            aria-label={t('common.navigation.open')}
          >
            <i className="bx bx-menu fs-4" />
          </button>

          <button
            type="button"
            onClick={toggleCollapse}
            className="btn btn-sm px-3 header-item d-none d-lg-inline-flex"
            aria-label={t(isCollapsed ? 'common.navigation.open' : 'common.navigation.collapse')}
          >
            <i className={`bx fs-4 ${isCollapsed ? 'bx-menu-alt-right' : 'bx-menu-alt-left'}`} />
          </button>

          <div className="ms-2">
            <p className="text-muted mb-0 small">{t('admin.header.eyebrow')}</p>
            <h1 className="h5 mb-0">{t('admin.header.title')}</h1>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <LocaleSwitcher />
          <FederationSwitcher variant="admin" />
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="btn btn-sm btn-outline-danger"
          >
            {t(loggingOut ? 'common.actions.loggingOut' : 'common.actions.logout')}
          </button>
        </div>
      </div>
    </header>
  )
}
