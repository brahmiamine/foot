import { ReactNode } from "react";
import { AdminSidebarProvider } from "./AdminSidebarContext";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import type { ClientAccess } from "@/lib/access-client";
import type { ResolvedBranding } from "@/lib/branding";

interface AdminLayoutProps {
  children: ReactNode;
  branding: ResolvedBranding;
  userName: string;
  access: ClientAccess;
}

/**
 * Admin Layout — même assemblage qu'arbinote/superadmin : sidebar sombre +
 * colonne de contenu claire (bg-gray-50) avec header puis contenu padded.
 * `branding` (logo, nom, couleurs du club) est résolu une seule fois par
 * `admin/layout.tsx` et transmis en props, jamais refetché par un
 * composant enfant.
 */
export function AdminLayout({ children, branding, userName, access }: AdminLayoutProps) {
  return (
    <AdminSidebarProvider>
      <div className="skote-admin">
        <div className="d-flex min-vh-100">
          <AdminSidebar branding={branding} access={access} />
          <div className="skote-content d-flex flex-column">
            <AdminHeader branding={branding} userName={userName} />
            <main className="page-content">{children}</main>
          </div>
        </div>
      </div>
    </AdminSidebarProvider>
  );
}
