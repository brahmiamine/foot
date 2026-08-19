import { redirect } from "next/navigation";
import { getUserAccess } from "@/lib/access";
import { requireTeamId } from "@/lib/team-context";
import { createClubIdentityMemberRegistrationAdapter } from "@/adapters/identity/createClubIdentityMemberRegistrationAdapter";
import type { MemberRegistrationMode } from "../../../../../../packages/domain-contracts/src/identity";
import {
  approveMemberRegistrationAction,
  inviteMemberAction,
  rejectMemberRegistrationAction,
  updateMemberRegistrationPolicyAction,
} from "./actions";

export const dynamic = "force-dynamic";

const MODES: Array<{ value: MemberRegistrationMode; label: string; description: string }> = [
  { value: "OPEN", label: "Ouverte", description: "Compte et affiliation créés immédiatement." },
  { value: "EMAIL_VERIFICATION", label: "Email vérifié", description: "Un lien email doit être consommé avant activation." },
  { value: "CLUB_APPROVAL", label: "Approbation club", description: "La demande reste en attente jusqu'à validation du club." },
  { value: "INVITE_ONLY", label: "Sur invitation", description: "Seuls les emails invités avec un jeton valide peuvent rejoindre le club." },
  { value: "CLOSED", label: "Fermée", description: "Aucune nouvelle adhésion club n'est acceptée." },
];

export default async function MemberRegistrationSettingsPage() {
  const access = await getUserAccess();
  if (!access.isClubAdmin) redirect("/admin");
  const teamId = await requireTeamId();
  const identity = createClubIdentityMemberRegistrationAdapter();
  const [policy, requests] = await Promise.all([
    identity.getMemberRegistrationPolicy(teamId),
    identity.listPendingMemberRegistrations(teamId),
  ]);

  return (
    <div className="container-fluid px-0 d-flex flex-column gap-4">
      <div>
        <h1 className="h4 mb-1">Inscriptions membres</h1>
        <p className="text-muted mb-0">
          Identity applique ce mode côté serveur aux inscriptions par mot de passe et Google OAuth.
        </p>
      </div>

      <form action={updateMemberRegistrationPolicyAction} className="card border-0 shadow-sm">
        <div className="card-body d-flex flex-column gap-3">
          <div>
            <label className="form-label" htmlFor="mode">Mode effectif</label>
            <select className="form-select" id="mode" name="mode" defaultValue={policy.mode}>
              {MODES.map((mode) => <option key={mode.value} value={mode.value}>{mode.label}</option>)}
            </select>
            <div className="form-text">
              {MODES.find((mode) => mode.value === policy.mode)?.description} Version {policy.version || "par défaut"}.
            </div>
          </div>
          <div>
            <label className="form-label" htmlFor="reason">Motif du changement</label>
            <textarea className="form-control" id="reason" name="reason" minLength={3} maxLength={1000} required rows={3} />
          </div>
        </div>
        <div className="card-footer bg-transparent text-end">
          <button className="btn btn-primary" type="submit">Enregistrer la policy</button>
        </div>
      </form>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          <h2 className="h6">Inviter un membre</h2>
          <form action={inviteMemberAction} className="d-flex gap-2 flex-wrap">
            <input className="form-control flex-grow-1" type="email" name="email" required placeholder="supporter@example.com" />
            <button className="btn btn-outline-primary" type="submit">Envoyer l&apos;invitation</button>
          </form>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-transparent">
          <strong>Demandes en attente d&apos;approbation ({requests.length})</strong>
        </div>
        <div className="card-body p-0">
          {requests.length === 0 ? (
            <p className="p-4 text-muted mb-0">Aucune demande à traiter.</p>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead><tr><th>Membre</th><th>Email</th><th>Canal</th><th>Demandée le</th><th>Décision</th></tr></thead>
                <tbody>
                  {requests.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.email}</td>
                      <td>{item.provider}</td>
                      <td>{new Date(item.createdAt).toLocaleString("fr-FR")}</td>
                      <td>
                        <div className="d-flex flex-column gap-2">
                          <form action={approveMemberRegistrationAction}>
                            <input type="hidden" name="requestId" value={item.id} />
                            <button className="btn btn-sm btn-success" type="submit">Approuver</button>
                          </form>
                          <form action={rejectMemberRegistrationAction} className="d-flex gap-2">
                            <input type="hidden" name="requestId" value={item.id} />
                            <input className="form-control form-control-sm" name="reason" minLength={3} maxLength={1000} required placeholder="Motif" />
                            <button className="btn btn-sm btn-outline-danger" type="submit">Refuser</button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
