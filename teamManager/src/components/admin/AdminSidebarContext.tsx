"use client";

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";

interface AdminSidebarContextType {
  isOpen: boolean; // Mobile drawer open/close
  isCollapsed: boolean; // Desktop collapsed (icon rail) / expanded
  toggleSidebar: () => void;
  toggleCollapse: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
}

const AdminSidebarContext = createContext<AdminSidebarContextType | undefined>(undefined);

/**
 * Provider for admin sidebar state — même modèle qu'arbinote/superadmin :
 * `isOpen` pilote le tiroir mobile, `isCollapsed` le mode icône seule desktop.
 */
export function AdminSidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = useCallback(() => setIsOpen((prev) => !prev), []);
  const toggleCollapse = useCallback(() => setIsCollapsed((prev) => !prev), []);
  const openSidebar = useCallback(() => setIsOpen(true), []);
  const closeSidebar = useCallback(() => setIsOpen(false), []);

  return (
    <AdminSidebarContext.Provider
      value={{ isOpen, isCollapsed, toggleSidebar, toggleCollapse, openSidebar, closeSidebar }}
    >
      {children}
    </AdminSidebarContext.Provider>
  );
}

export function useAdminSidebar() {
  const context = useContext(AdminSidebarContext);
  if (!context) {
    throw new Error("useAdminSidebar must be used within an AdminSidebarProvider");
  }
  return context;
}
