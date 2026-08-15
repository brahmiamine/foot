import { FederationLicenseCard } from "@/components/license/FederationLicenseCard";
import { auth } from "@/lib/auth";
import { getDataSource } from "@/lib/database";
import { listPersonLicenseCards } from "../../../../packages/regulatory-shared/src/licenseCard";

export default async function LicencePage() {
  const session = await auth();
  if (!session) return null;
  const dataSource = await getDataSource();
  const linkedStaff = await dataSource.query(
    "SELECT id FROM cms_staff WHERE team_id = ? AND CAST(user_id AS CHAR) = ? AND staff_type IN ('KINE','MEDECIN')",
    [session.user.teamId, session.user.id],
  ) as Array<{ id: string | number }>;
  const licenses = await listPersonLicenseCards(dataSource, {
    personTypes: ["MEDICAL", "STAFF"],
    userId: session.user.id,
    personReferenceIds: linkedStaff.map((item) => String(item.id)),
    clubId: session.user.teamId,
  });
  const current = licenses[0];
  return <div style={{ display: "grid", gap: "1.25rem" }}>
    <div><h1 style={{ fontSize: "1.25rem", margin: 0 }}>Ma licence</h1><p style={{ margin: "6px 0 0", color: "var(--mh-text-muted)", fontSize: ".86rem" }}>Cette page affiche uniquement votre statut fédéral et ne révèle aucune donnée médicale de joueur.</p></div>
    {!current ? <div style={{ padding: "1.2rem", border: "1px solid var(--mh-border)", borderRadius: 12, background: "var(--mh-card-bg)" }}><strong>Aucune licence liée à ce compte</strong><p style={{ margin: "6px 0 0", color: "var(--mh-text-muted)", fontSize: ".85rem" }}>La fiche médecin/kiné doit être liée au compte connecté et disposer d’un dossier de licence dans le workflow fédéral.</p></div> : <>
      <FederationLicenseCard license={current} holderName={session.user.name} />
      {current.expiresAt && <p style={{ margin: 0, color: "var(--mh-text-muted)", fontSize: ".8rem" }}>Expiration : {new Date(current.expiresAt).toLocaleDateString("fr-FR")}</p>}
      {licenses.length > 1 && <div><h2 style={{ fontSize: "1rem" }}>Historique des licences</h2><div style={{ display: "grid", gap: 8 }}>{licenses.slice(1).map((license) => <div key={license.id} style={{ padding: "10px 12px", border: "1px solid var(--mh-border)", borderRadius: 10, background: "var(--mh-card-bg)", display: "flex", justifyContent: "space-between", gap: 12, fontSize: ".84rem" }}><span>{license.seasonName ?? "Saison"} · {license.licenseType}</span><strong>{license.licenseNumber ?? license.status}</strong></div>)}</div></div>}
    </>}
  </div>;
}
