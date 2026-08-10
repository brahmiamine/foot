import { notFound } from "next/navigation";
import { TeamService } from "@/services/TeamService";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { SponsorRequestForm } from "./SponsorRequestForm";

export const dynamic = "force-dynamic";

/**
 * Page publique — formulaire de demande de partenariat sponsor pour un club.
 * Accessible sans authentification : /devenir-sponsor/[teamId].
 */
export default async function SponsorRequestPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const teamService = new TeamService();
  const team = await teamService.findById(teamId);

  if (!team) {
    notFound();
  }

  return (
    <div className="container py-5" style={{ maxWidth: "720px" }}>
      <div className="text-center mb-4">
        {team.logoUrl && (
          <ImageWithFallback
            src={team.logoUrl}
            alt={team.nom}
            style={{ height: "80px", objectFit: "contain" }}
            className="mb-3"
            fallbackIcon="fas fa-shield-alt fa-2x"
          />
        )}
        <h1 className="h3 mb-2">Devenir sponsor de {team.nom}</h1>
        <p className="text-muted">
          Vous souhaitez soutenir le club et gagner en visibilité ? Remplissez ce formulaire, notre équipe étudiera
          votre demande de partenariat.
        </p>
      </div>

      <div className="card shadow-sm">
        <div className="card-body p-4">
          <SponsorRequestForm teamId={teamId} />
        </div>
      </div>
    </div>
  );
}
