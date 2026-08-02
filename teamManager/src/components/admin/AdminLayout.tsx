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
      <div className="skote-admin">
        <div className="d-flex min-vh-100">
          <AdminSidebar teamName={teamName} />
          <div className="skote-content d-flex flex-column">
            <AdminHeader userName={userName} />
            <main className="page-content">{children}</main>
          </div>
        </div>
      </div>
    </AdminSidebarProvider>
  );
}
