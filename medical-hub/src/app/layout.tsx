import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserAccess } from "@/lib/access";
import { toClientAccess } from "@/lib/access-client";
import { buildLoginUrlForPath } from "@/lib/ssoSession";
import { getClubBranding } from "@/lib/clubBranding";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const session = await auth();
  if (!session) return { title: "Espace Médical" };

  const branding = await getClubBranding(session.user.teamId);
  return {
    title: `Espace Médical — ${branding.name}`,
    icons: branding.faviconUrl ? { icon: branding.faviconUrl } : undefined,
  };
}

// Garde-fou serveur : sans session staff valide (voir lib/auth.ts), impossible
// d'atteindre une seule page directement — le middleware fait déjà cette
// vérification, ce layout la refait pour ne dépendre que d'un seul
// mécanisme. L'accès aux DONNÉES médicales elles-mêmes (permission
// "medical.view"/"medical.manage") est vérifié page par page, pas ici : un
// membre du staff sans cette permission peut arriver jusqu'à la coquille
// (sidebar réduite aux Notifications), mais chaque page redirige s'il lui
// manque la permission — voir lib/access.ts.
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) {
    redirect(await buildLoginUrlForPath("/"));
  }

  const [access, branding] = await Promise.all([getUserAccess(), getClubBranding(session.user.teamId)]);

  return (
    <html lang="fr">
      <body>
        <AppShell userName={session.user.name} role={session.user.role} clubBranding={branding} access={toClientAccess(access)}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
