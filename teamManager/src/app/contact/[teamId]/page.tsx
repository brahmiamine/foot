import { notFound } from "next/navigation";
import { TeamService } from "@/services/TeamService";
import { ContactService } from "@/services/ContactService";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import { ContactForm } from "./ContactForm";

export const dynamic = "force-dynamic";

/** Page publique — contact du club : /contact/[teamId]. */
export default async function ContactPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const teamService = new TeamService();
  const team = await teamService.findById(teamId);

  if (!team) {
    notFound();
  }

  const info = await new ContactService().getInfo(teamId);

  return (
    <div className="container py-5" style={{ maxWidth: "960px" }}>
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
        <h1 className="h3 mb-2">Contactez {team.nom}</h1>
      </div>

      <div className="row g-4">
        <div className="col-md-4">
          <div className="card shadow-sm h-100">
            <div className="card-body">
              <h2 className="h6 text-uppercase text-muted mb-3">Coordonnées</h2>
              {info?.addressFr && (
                <p className="mb-2">
                  <i className="fas fa-map-marker-alt me-2" aria-hidden="true" />
                  {info.addressFr}
                </p>
              )}
              {info?.phone && (
                <p className="mb-2">
                  <i className="fas fa-phone me-2" aria-hidden="true" />
                  {info.phone}
                </p>
              )}
              {info?.email && (
                <p className="mb-2">
                  <i className="fas fa-envelope me-2" aria-hidden="true" />
                  {info.email}
                </p>
              )}
              {info?.openingHoursFr && (
                <p className="mb-0">
                  <i className="fas fa-clock me-2" aria-hidden="true" />
                  {info.openingHoursFr}
                </p>
              )}

              {(info?.adminPhone || info?.adminEmail) && (
                <>
                  <hr />
                  <div className="small">
                    <strong>Administratif</strong>
                    <div>{info.adminPhone}</div>
                    <div>{info.adminEmail}</div>
                  </div>
                </>
              )}
              {(info?.sportPhone || info?.sportEmail) && (
                <div className="small mt-2">
                  <strong>Sportif</strong>
                  <div>{info.sportPhone}</div>
                  <div>{info.sportEmail}</div>
                </div>
              )}
              {(info?.academyPhone || info?.academyEmail) && (
                <div className="small mt-2">
                  <strong>Académie</strong>
                  <div>{info.academyPhone}</div>
                  <div>{info.academyEmail}</div>
                </div>
              )}
              {(info?.partnershipPhone || info?.partnershipEmail) && (
                <div className="small mt-2">
                  <strong>Partenariats</strong>
                  <div>{info.partnershipPhone}</div>
                  <div>{info.partnershipEmail}</div>
                </div>
              )}

              {info?.mapEmbedUrl && (
                <div className="ratio ratio-4x3 mt-3">
                  <iframe src={info.mapEmbedUrl} loading="lazy" title="Carte" style={{ border: 0 }} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-8">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <ContactForm teamId={teamId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
