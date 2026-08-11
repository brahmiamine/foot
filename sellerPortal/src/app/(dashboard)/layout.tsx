import { redirect } from "next/navigation";
import { getCurrentSellerSession } from "@/lib/session";
import { getDataSource } from "@/lib/database";
import { Seller } from "@/entities/Seller";
import { DashboardShell } from "@/components/layout/DashboardShell";

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

  return (
    <DashboardShell sellerName={seller.businessName} sellerStatus={seller.status} userName={session.name}>
      {children}
    </DashboardShell>
  );
}
