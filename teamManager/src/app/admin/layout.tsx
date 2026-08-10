import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { TeamService } from "@/services/TeamService";
import { getUserAccess, toClientAccess } from "@/lib/access";
import { AdminLayout } from "@/components/admin/AdminLayout";
import "./skote-admin.css";

// L'admin lit toujours l'état live de la base partagée (players, staff,
// matchs...) : jamais de rendu statique / cache au build.
export const dynamic = "force-dynamic";

/**
 * Admin Layout
 * Vérifie la session (un compte = un club, table `User` partagée avec
 * cardManager) puis affiche le nom du club connecté dans la sidebar/header.
 */
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.teamId) {
    redirect("/login");
  }

  const teamService = new TeamService();
  const team = await teamService.findById(session.user.teamId);
  const access = toClientAccess(await getUserAccess());

  return (
    <AdminLayout teamName={team?.nom ?? "Club"} userName={session.user.name ?? session.user.email ?? ""} access={access}>
      {children}
    </AdminLayout>
  );
}
