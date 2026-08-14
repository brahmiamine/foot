import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { buildPlayerLoginUrlForPath } from "@/lib/ssoSession";
import { playerPortalService } from "@/services/PlayerPortalService";
import { getClubBranding } from "@/lib/clubBranding";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const session = await auth();
  if (!session) return { title: "Espace Joueur" };

  const branding = await getClubBranding(session.user.teamId);
  return {
    title: `Espace Joueur — ${branding.name}`,
    icons: branding.faviconUrl ? { icon: branding.faviconUrl } : undefined,
  };
}

// Garde-fou serveur : sans session PLAYER valide (voir lib/auth.ts), impossible
// d'atteindre une seule page, même en connaissant l'URL directement — le
// middleware fait déjà cette vérification, ce layout la refait pour ne
// dépendre que d'un seul mécanisme en cas de nouvelle route qui y échapperait.
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) {
    redirect(await buildPlayerLoginUrlForPath("/"));
  }

  const [player, branding] = await Promise.all([
    playerPortalService.getPlayer(session.user.playerId),
    getClubBranding(session.user.teamId),
  ]);

  if (!player) {
    redirect(await buildPlayerLoginUrlForPath("/"));
  }

  const playerName = `${player.firstNameFr} ${player.lastNameFr}`;

  return (
    <html lang="fr">
      <body>
        <AppShell playerName={playerName} playerNumber={player.number} userName={session.user.name} clubBranding={branding}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
