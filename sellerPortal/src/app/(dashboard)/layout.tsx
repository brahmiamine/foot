import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSellerSession } from "@/lib/session";
import { getDataSource } from "@/lib/database";
import { Seller } from "@/entities/Seller";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { getClubBranding } from "@/lib/clubBranding";

// Titre/favicon résolus dynamiquement par club connecté (voir
// lib/clubBranding.ts) — jamais hardcodés à un club en particulier. Sans
// session valide, on retombe sur les métadonnées génériques du layout
// racine (title "Seller Portal").
export async function generateMetadata(): Promise<Metadata> {
  const session = await getCurrentSellerSession();
  if (!session) return {};

  const ds = await getDataSource();
  const seller = await ds.getRepository(Seller).findOne({ where: { id: session.sellerId } });
  if (!seller) return {};

  const branding = await getClubBranding(seller.clubId);
  return {
    title: `${branding.name} — Seller Portal`,
    icons: branding.faviconUrl ? { icon: branding.faviconUrl } : undefined,
  };
}

// Garde-fou serveur : sans session valide, impossible d'atteindre une seule
// page privée, même en connaissant l'URL directement.
export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSellerSession();
  if (!session) {
    redirect("/login");
  }

  const ds = await getDataSource();
  const seller = await ds.getRepository(Seller).findOne({ where: { id: session.sellerId } });
  if (!seller) {
    redirect("/login");
  }

  const branding = await getClubBranding(seller.clubId);

  return (
    <DashboardShell
      sellerName={seller.businessName}
      sellerStatus={seller.status}
      userName={session.name}
      clubBranding={branding}
    >
      {children}
    </DashboardShell>
  );
}
