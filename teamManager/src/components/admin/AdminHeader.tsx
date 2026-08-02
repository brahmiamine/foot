"use client";

import { signOut } from "next-auth/react";
import { useAdminSidebar } from "./AdminSidebarContext";

/**
 * Admin Header — même structure qu'arbinote (bg-white, border-b, shadow-sm).
 * Fusionne l'ancien AdminSidebarToggle + LogoutButton.
 */
export function AdminHeader({ userName }: { userName: string }) {
  const { toggleSidebar } = useAdminSidebar();

  return (
    <header className="px-4 sm:px-6 lg:px-8 py-4 border-b border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Menu"
          >
            <i className="fas fa-bars text-gray-600" aria-hidden="true" />
          </button>
          <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-gray-900">Administration</h1>
        </div>
        <div className="flex items-center gap-3">
          {userName && <span className="hidden sm:inline text-sm text-gray-500">{userName}</span>}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm font-medium text-gray-600 hover:text-red-600 border border-gray-300 hover:border-red-300 rounded-md px-3 py-1.5 transition-colors"
          >
            <i className="fas fa-sign-out-alt mr-2" aria-hidden="true" />
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  );
}
