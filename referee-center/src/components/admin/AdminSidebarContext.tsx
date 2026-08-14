'use client'

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'

interface AdminSidebarContextType {
  isOpen: boolean
  isCollapsed: boolean
  toggleSidebar: () => void
  toggleCollapse: () => void
  closeSidebar: () => void
}

const AdminSidebarContext = createContext<AdminSidebarContextType | undefined>(undefined)

export function AdminSidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false) // Mobile drawer open/close
  const [isCollapsed, setIsCollapsed] = useState(false) // Desktop collapsed/expanded

  // Fermer le drawer mobile lors du redimensionnement
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsOpen(false)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const toggleSidebar = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const toggleCollapse = useCallback(() => {
    setIsCollapsed((prev) => !prev)
  }, [])

  const closeSidebar = useCallback(() => {
    setIsOpen(false)
  }, [])

  return (
    <AdminSidebarContext.Provider
      value={{ isOpen, isCollapsed, toggleSidebar, toggleCollapse, closeSidebar }}
    >
      {children}
    </AdminSidebarContext.Provider>
  )
}

export function useAdminSidebar() {
  const context = useContext(AdminSidebarContext)
  if (!context) {
    throw new Error('useAdminSidebar must be used within AdminSidebarProvider')
  }
  return context
}

