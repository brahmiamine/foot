import { redirect } from "next/navigation";
import { getUserAccess } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { CLUB_FEATURES, type ClubFeature } from "@/entities/ClubFeatureSettings";
import { ClubFeatureSettingsService } from "@/services/ClubFeatureSettingsService";
import { updateClubFeatureSettings } from "./actions";

export const dynamic = "force-dynamic";

const LABELS: Record<ClubFeature, { title: string; description: string }> = {
  ACADEMY: {
    title: "Académie",
    description: "Catégories de formation, contenu académie et candidatures publiques.",
  },
  RECRUITMENT: {
    title: "Recrutement",
    description: "Besoins de recrutement et candidatures publiques.",
  },
  SPONSORING: {
    title: "Sponsoring",
    description: "Demandes partenaires et gestion des contrats sponsors.",
  },
  TICKETING: {
    title: "Billetterie",
    description: "Catégories de billets, matchs et règles de vente administrées par le club.",
  },
  MARKETPLACE: {
    title: "Marketplace",
    description: "Vendeurs, demandes, modération produits et paramètres marketplace.",
  },
};

export default async function ClubFeatureSettingsPage() {
  const access = await getUserAccess();
  if (!access.isClubAdmin) redirect("/admin");
  const teamId = await requireTeamId();
  const settings = await new ClubFeatureSettingsService().listEffective(teamId, CLUB_FEATURES);

  return (
    <div className="container-fluid px-0 skote-settings-narrow">
      <div className="mb-4">
        <h1 className="h4 mb-1">Fonctionnalités du club</h1>
        <p className="text-muted mb-0">
          Ces réglages sont appliqués côté serveur. Désactiver un module bloque aussi ses actions et API, même via un accès direct.
        </p>
      </div>

      <form action={updateClubFeatureSettings} className="card border-0 shadow-sm">
        <div className="card-body d-flex flex-column gap-4">
          {CLUB_FEATURES.map((feature) => {
            const setting = settings[feature];
            return (
              <div key={feature} className="d-flex justify-content-between gap-3 border-bottom pb-3">
                <div>
                  <h2 className="h6 mb-1">{LABELS[feature].title}</h2>
                  <p className="small text-muted mb-1">{LABELS[feature].description}</p>
                  <span className="small text-muted">Version effective : {setting.version || "défaut"}</span>
                </div>
                <div className="form-check form-switch mt-1">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    name={`feature_${feature}`}
                    id={`feature_${feature}`}
                    defaultChecked={setting.enabled}
                  />
                  <label className="form-check-label" htmlFor={`feature_${feature}`}>
                    {setting.enabled ? "Activé" : "Désactivé"}
                  </label>
                </div>
              </div>
            );
          })}

          <div>
            <label className="form-label" htmlFor="reason">Motif du changement</label>
            <textarea
              className="form-control"
              id="reason"
              name="reason"
              minLength={3}
              maxLength={1000}
              required
              rows={3}
              placeholder="Ex. suspension temporaire du module pendant une maintenance"
            />
            <div className="form-text">Le motif est conservé dans l&apos;audit de configuration.</div>
          </div>
        </div>
        <div className="card-footer bg-transparent text-end">
          <button type="submit" className="btn btn-primary">Enregistrer les fonctionnalités</button>
        </div>
      </form>
    </div>
  );
}
