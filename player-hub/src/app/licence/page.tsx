import { FederationLicenseCard } from "@/components/license/FederationLicenseCard";
import { auth } from "@/lib/auth";
import { getDataSource } from "@/lib/database";
import { playerPortalService } from "@/services/PlayerPortalService";
import { listPersonLicenseCards } from "../../../../packages/regulatory-shared/src/licenseCard";

export default async function LicencePage() {
  const session = await auth();
  if (!session) return null;

  const [dataSource, player] = await Promise.all([
    getDataSource(),
    playerPortalService.getPlayer(session.user.playerId),
  ]);
  const licenses = await listPersonLicenseCards(dataSource, {
    personTypes: ["PLAYER"],
    userId: session.user.id,
    personReferenceIds: [session.user.playerId],
    clubId: session.user.teamId,
  });
  const holderName = player ? `${player.firstNameFr} ${player.lastNameFr}` : session.user.name;
  const current = licenses[0];

  return <div style={{ display: "grid", gap: "1.25rem" }}>
    <div><h1 style={{ fontSize: "1.25rem", margin: 0 }}>Ma licence</h1><p style={{ margin: "6px 0 0", color: "var(--ph-text-muted)", fontSize: ".86rem" }}>Votre carte fédérale numérique est alimentée directement par le dossier réglementaire validé par la fédération.</p></div>
    {!current ? <div style={{ padding: "1.2rem", border: "1px solid var(--ph-border)", borderRadius: 12, background: "var(--ph-card-bg)" }}><strong>Aucune licence fédérale disponible</strong><p style={{ margin: "6px 0 0", color: "var(--ph-text-muted)", fontSize: ".85rem" }}>Le club doit déposer votre demande puis la fédération doit la traiter. Aucun numéro n’est généré par le Player Hub.</p></div> : <>
      <FederationLicenseCard license={current} holderName={holderName} />
      {current.expiresAt && <p style={{ margin: 0, color: "var(--ph-text-muted)", fontSize: ".8rem" }}>Expiration : {new Date(current.expiresAt).toLocaleDateString("fr-FR")}</p>}
      {licenses.length > 1 && <div><h2 style={{ fontSize: "1rem" }}>Historique des licences</h2><div style={{ display: "grid", gap: 8 }}>{licenses.slice(1).map((license) => <div key={license.id} style={{ padding: "10px 12px", border: "1px solid var(--ph-border)", borderRadius: 10, background: "var(--ph-card-bg)", display: "flex", justifyContent: "space-between", gap: 12, fontSize: ".84rem" }}><span>{license.seasonName ?? "Saison"} · {license.licenseType}</span><strong>{license.licenseNumber ?? license.status}</strong></div>)}</div></div>}
    </>}
  </div>;
}
