import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTeamContext } from "@/lib/branding";
import { BrandingForm } from "./BrandingForm";

export const dynamic = "force-dynamic";

/**
 * Page Identité & apparence — module "Branding" : nom affiché, logos
 * (clair/sombre), favicon et couleurs du club, résolus avec repli sur le
 * référentiel partagé `teams` (voir lib/branding.ts). Réservée au président
 * du club (ADMIN) : les coachs ne doivent pas pouvoir changer l'identité
 * visuelle vue par tout le club.
 */
export default async function BrandingSettingsPage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") redirect("/admin");

  const branding = await getTeamContext();

  return (
    <div className="container-fluid px-0">
      <div className="mb-4">
        <h1 className="h4 mb-1">Identité & apparence</h1>
        <p className="text-muted mb-0">
          Personnalisez le nom affiché, le logo et les couleurs de votre espace — visibles par tous les comptes du club après connexion.
        </p>
      </div>

      <BrandingForm branding={branding} />
    </div>
  );
}
