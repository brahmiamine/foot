import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserAccess, toClientAccess } from "@/lib/access";
import { getTeamContext, buildBrandingCssVars } from "@/lib/branding";
import { AdminLayout } from "@/components/admin/AdminLayout";
import "./skote-admin.css";

// L'admin lit toujours l'état live de la base partagée (players, staff,
// matchs...) : jamais de rendu statique / cache au build.
export const dynamic = "force-dynamic";

/**
 * Titre d'onglet + favicon dynamiques, résolus depuis le branding du club
 * connecté (session.user.teamId). Avant authentification (accès direct à
 * une page /admin sans session), on retombe sur un titre générique — le
 * layout ci-dessous redirige de toute façon vers /login dans ce cas.
 */
export async function generateMetadata(): Promise<Metadata> {
  try {
    const branding = await getTeamContext();
    return {
      title: `${branding.shortName} — TeamManager`,
      icons: branding.faviconUrl ? { icon: branding.faviconUrl } : undefined,
    };
  } catch {
    return { title: "TeamManager" };
  }
}

/**
 * Admin Layout
 * Vérifie la session (un compte = un club, table `User` partagée avec
 * cardManager) puis résout l'identité & apparence du club (module
 * "Branding", voir lib/branding.ts) : logo, nom affiché, couleurs. Les
 * couleurs sont injectées en variables CSS (`--skote-primary`, etc.),
 * consommées par tout le thème `skote-admin.css` — aucun composant n'a
 * besoin de connaître la couleur du club, seul ce point d'entrée la résout.
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

  const access = toClientAccess(await getUserAccess());
  const branding = await getTeamContext();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `:root{${buildBrandingCssVars(branding)}}` }} />
      <AdminLayout branding={branding} userName={session.user.name ?? session.user.email ?? ""} access={access}>
        {children}
      </AdminLayout>
    </>
  );
}
