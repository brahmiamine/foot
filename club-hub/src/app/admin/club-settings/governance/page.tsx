import { redirect } from "next/navigation";
import { getUserAccess } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { ClubApprovalService } from "@/services/ClubApprovalService";
import { updateClubGovernanceSettings } from "./actions";
import type { ClubApprovalMode } from "@/entities/ClubGovernance";

export const dynamic = "force-dynamic";

function ModeSelect({ name, value }: { name: string; value: ClubApprovalMode }) {
  return (
    <select className="form-select" name={name} defaultValue={value}>
      <option value="AUTO">Automatique</option>
      <option value="SINGLE_APPROVAL">1 approbateur</option>
      <option value="DUAL_APPROVAL">2 approbateurs</option>
    </select>
  );
}

export default async function GovernanceSettingsPage() {
  const access = await getUserAccess();
  if (!access.isClubAdmin) redirect("/admin");
  const teamId = await requireTeamId();
  const settings = await new ClubApprovalService().getSettings(teamId);

  return (
    <div className="container-fluid px-0 skote-settings-narrow">
      <div className="mb-4">
        <h1 className="h4 mb-1">Gouvernance & approbations</h1>
        <p className="text-muted mb-0">
          Définissez qui peut publier directement et quelles modifications doivent repasser en validation.
        </p>
      </div>

      <form action={updateClubGovernanceSettings} className="card">
        <div className="card-body d-flex flex-column gap-4">
          <div className="form-check form-switch">
            <input className="form-check-input" type="checkbox" name="makerCheckerEnabled" id="makerCheckerEnabled" defaultChecked={settings.makerCheckerEnabled} />
            <label className="form-check-label" htmlFor="makerCheckerEnabled">
              Le créateur ne peut pas approuver sa propre demande
            </label>
          </div>

          <section>
            <h2 className="h6">Actualités</h2>
            <div className="row g-3 align-items-end">
              <div className="col-md-6">
                <label className="form-label">Publication</label>
                <ModeSelect name="newsApprovalMode" value={settings.newsApprovalMode} />
              </div>
              <div className="col-md-6">
                <div className="form-check form-switch mb-2">
                  <input className="form-check-input" type="checkbox" name="newsReapprovalOnSensitiveChange" id="newsReapproval" defaultChecked={settings.newsReapprovalOnSensitiveChange} />
                  <label className="form-check-label" htmlFor="newsReapproval">Revalider après modification sensible</label>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="h6">Communiqués officiels</h2>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">Communiqué standard</label>
                <ModeSelect name="announcementDefaultApprovalMode" value={settings.announcementDefaultApprovalMode} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Décision officielle</label>
                <ModeSelect name="announcementDecisionApprovalMode" value={settings.announcementDecisionApprovalMode} />
              </div>
              <div className="col-md-4">
                <label className="form-label">Sanction publique</label>
                <ModeSelect name="announcementSanctionApprovalMode" value={settings.announcementSanctionApprovalMode} />
              </div>
            </div>
            <div className="form-check form-switch mt-3">
              <input className="form-check-input" type="checkbox" name="announcementReapprovalOnSensitiveChange" id="announcementReapproval" defaultChecked={settings.announcementReapprovalOnSensitiveChange} />
              <label className="form-check-label" htmlFor="announcementReapproval">Revalider après modification sensible</label>
            </div>
          </section>

          <section>
            <h2 className="h6">Boutique du club</h2>
            <div className="row g-3 align-items-end">
              <div className="col-md-6">
                <label className="form-label">Activation d'un produit</label>
                <ModeSelect name="shopProductApprovalMode" value={settings.shopProductApprovalMode} />
              </div>
              <div className="col-md-6">
                <div className="form-check form-switch mb-2">
                  <input className="form-check-input" type="checkbox" name="shopProductReapprovalOnSensitiveChange" id="shopReapproval" defaultChecked={settings.shopProductReapprovalOnSensitiveChange} />
                  <label className="form-check-label" htmlFor="shopReapproval">Revalider prix/contenu/image</label>
                </div>
              </div>
            </div>
            <p className="small text-muted mt-2 mb-0">Une mise à jour de stock seule ne redemande pas d'approbation.</p>
          </section>
        </div>
        <div className="card-footer bg-transparent d-flex justify-content-between align-items-center">
          <span className="small text-muted">Version effective : {settings.version}</span>
          <button className="btn btn-primary" type="submit">Enregistrer</button>
        </div>
      </form>
    </div>
  );
}
