'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import FederationSwitcher from '../FederationSwitcher'
import { useAdminSidebar } from './AdminSidebarContext'
import { useTranslations, type Locale } from '@/lib/i18n'

export default function AdminHeader() {
  const { toggleSidebar, toggleCollapse, isCollapsed } = useAdminSidebar()
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)
  const { locale, switchLocale, t } = useTranslations()

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
            aria-label={t('admin.header.openMenu')}
          >
            <i className="bx bx-menu fs-4" />
          </button>

          <button
            type="button"
            onClick={toggleCollapse}
            className="btn btn-sm px-3 header-item d-none d-lg-inline-flex"
            aria-label={isCollapsed ? t('admin.header.openMenu') : t('admin.header.collapseMenu')}
          >
            <i className={`bx fs-4 ${isCollapsed ? 'bx-menu-alt-right' : 'bx-menu-alt-left'}`} />
          </button>

          <div className="ms-2">
            <p className="text-muted mb-0 small">{t('admin.header.eyebrow')}</p>
            <h1 className="h5 mb-0">{t('admin.header.title')}</h1>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2">
          <FederationSwitcher variant="admin" />
          <label className="visually-hidden" htmlFor="admin-language">{t('admin.header.language')}</label>
          <select id="admin-language" className="form-select form-select-sm w-auto" value={locale === 'ar' ? 'ar' : 'fr'} onChange={(event) => switchLocale(event.target.value as Locale)} aria-label={t('admin.header.language')}>
            <option value="fr">Français</option>
            <option value="ar">العربية</option>
          </select>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="btn btn-sm btn-outline-danger"
          >
            {loggingOut ? t('admin.header.loggingOut') : t('admin.header.logout')}
          </button>
        </div>
      </div>
    </header>
  )
}
