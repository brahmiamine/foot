import { getTranslator } from "@/i18n/server";
import { notFound } from "next/navigation";
import { TeamService } from "@/services/TeamService";
import { RecruitmentService } from "@/services/RecruitmentService";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { RecruitmentForm } from "./RecruitmentForm";

export const dynamic = "force-dynamic";

/** Page publique — détection/recrutement (jeunes et seniors) : /recrutement/[teamId]. */
export default async function RecruitmentPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { locale, t } = await getTranslator();
  const { teamId } = await params;
  const teamService = new TeamService();
  const team = await teamService.findById(teamId);

  if (!team) {
    notFound();
  }

  const needs = await new RecruitmentService().findAllNeeds(teamId, true);

  return (
    <div className="container py-5" style={{ maxWidth: "820px" }}>
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
        <h1 className="h3 mb-2">{t("recruitment.page.title", { team: locale === "ar" && team.nomAr ? team.nomAr : team.nom })}</h1>
        <p className="text-muted">{t("recruitment.page.help")}</p>
      </div>

      {needs.length > 0 && (
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h2 className="h6 text-uppercase text-muted mb-3">{t("recruitment.page.requestedPositions")}</h2>
            <ul className="list-unstyled mb-0">
              {needs.map((need) => (
                <li key={need.id} className="mb-2">
                  <span className="badge bg-primary me-2">{need.category}</span>
                  <strong>{need.position}</strong>
                  {need.descriptionFr && <div className="text-muted small">{need.descriptionFr}</div>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="card shadow-sm">
        <div className="card-body p-4">
          <RecruitmentForm teamId={teamId} />
        </div>
      </div>
    </div>
  );
}
