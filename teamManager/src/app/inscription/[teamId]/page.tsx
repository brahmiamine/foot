import { getTranslator } from "@/i18n/server";
import { notFound } from "next/navigation";
import { TeamService } from "@/services/TeamService";
import { AcademyService } from "@/services/AcademyService";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { InscriptionForm } from "./InscriptionForm";

export const dynamic = "force-dynamic";

const DEFAULT_CATEGORIES = ["U6", "U7", "U8", "U9", "U10", "U11", "U12", "U13", "U14", "U15", "U16", "U17", "U18", "U19"];

/**
 * Page publique — formulaire "Inscrire mon enfant" (formation/académie) :
 * /inscription/[teamId].
 */
export default async function InscriptionPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { locale, t } = await getTranslator();
  const { teamId } = await params;
  const teamService = new TeamService();
  const team = await teamService.findById(teamId);

  if (!team) {
    notFound();
  }

  const categories = await new AcademyService().findAllCategories(teamId);
  const categoryOptions = categories.length > 0 ? categories.filter((c) => c.isActive).map((c) => c.code) : DEFAULT_CATEGORIES;

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
        <h1 className="h3 mb-2">{t("academy.application.page.title", { team: locale === "ar" && team.nomAr ? team.nomAr : team.nom })}</h1>
        <p className="text-muted">
          {t("academy.application.page.help")}
        </p>
      </div>

      <div className="card shadow-sm">
        <div className="card-body p-4">
          <InscriptionForm teamId={teamId} categoryOptions={categoryOptions} />
        </div>
      </div>
    </div>
  );
}
