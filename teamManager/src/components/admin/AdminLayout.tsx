import { ReactNode } from "react";
import { AdminSidebarProvider } from "./AdminSidebarContext";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";

interface AdminLayoutProps {
  children: ReactNode;
  teamName: string;
  userName: string;
}

/**
 * Admin Layout — même assemblage qu'arbinote/superadmin : sidebar sombre +
 * colonne de contenu claire (bg-gray-50) avec header puis contenu padded.
 */
export function AdminLayout({ children, teamName, userName }: AdminLayoutProps) {
  return (
    <AdminSidebarProvider>
      <div className="min-h-screen bg-slate-950">
        <div className="flex min-h-screen">
          <AdminSidebar teamName={teamName} />
          <div className="flex-1 bg-gray-50 text-gray-900 min-w-0">
            <AdminHeader userName={userName} />
            <div className="p-4 sm:p-6 lg:p-8">{children}</div>
          </div>
        </div>
      </div>
    </AdminSidebarProvider>
  );
}
