import { auth } from "@/lib/auth";
import { getDataSource } from "@/lib/database";
import { playerPortalService } from "@/services/PlayerPortalService";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { listPersonLicenseCards, getLicenseStatusLabel } from "../../../../packages/regulatory-shared/src/licenseCard";

const CONTRACT_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  SIGNED: "Signé",
  TERMINATED: "Résilié",
  EXPIRED: "Expiré",
};

const REGISTRATION_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  SUBMITTED: "Déposée",
  APPROVED: "Approuvée",
  REJECTED: "Rejetée",
  SUSPENDED: "Suspendue",
  CANCELLED: "Annulée",
};

/**
 * PLAYER-003 — portefeuille documentaire réglementaire en lecture pour le
 * joueur : licence, contrat, inscription, aptitude médicale (FIT/UNFIT
 * uniquement, jamais de diagnostic — voir MedicalEligibility.privacy.test.ts),
 * suspension. Rien ici ne provient de cms_injuries.
 */
export default async function DossierPage() {
  const session = await auth();
  if (!session) return null;

  const [dataSource, portfolio, availability] = await Promise.all([
    getDataSource(),
    playerPortalService.getDocumentPortfolio(session.user.playerId),
    playerPortalService.getAvailability(session.user.playerId, session.user.teamId),
  ]);
  const licenses = await listPersonLicenseCards(dataSource, {
    personTypes: ["PLAYER"],
    userId: session.user.id,
    personReferenceIds: [session.user.playerId],
    clubId: session.user.teamId,
  });
  const currentLicense = licenses[0] ?? null;

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1 style={{ fontSize: "1.2rem", margin: 0 }}>Mon dossier</h1>
      <p style={{ margin: 0, color: "var(--ph-text-muted)", fontSize: ".86rem" }}>
        Vue d&apos;ensemble de votre situation réglementaire : licence, contrat, inscription, aptitude médicale.
      </p>

      <Card>
        <div style={{ fontSize: "0.8rem", color: "var(--ph-text-muted)", fontWeight: 600, marginBottom: 10 }}>Licence</div>
        {currentLicense ? (
          <Badge
            label={`${getLicenseStatusLabel(currentLicense.status, currentLicense.expiresAt)}${currentLicense.licenseNumber ? ` · ${currentLicense.licenseNumber}` : ""}`}
            tone={currentLicense.status === "APPROVED" ? "success" : "neutral"}
          />
        ) : (
          <span style={{ color: "var(--ph-text-muted)", fontSize: "0.86rem" }}>Aucune licence fédérale disponible.</span>
        )}
      </Card>

      <Card>
        <div style={{ fontSize: "0.8rem", color: "var(--ph-text-muted)", fontWeight: 600, marginBottom: 10 }}>Aptitude médicale</div>
        <Badge
          label={portfolio.medicalFit.status ? (portfolio.medicalFit.eligible ? "✅ Apte (FIT)" : `Non apte (${portfolio.medicalFit.status})`) : "Aucune visite enregistrée"}
          tone={portfolio.medicalFit.eligible ? "success" : "warning"}
        />
        {portfolio.medicalFit.expiresAt && (
          <div style={{ marginTop: 6, fontSize: "0.8rem", color: "var(--ph-text-muted)" }}>
            Expiration : {new Date(portfolio.medicalFit.expiresAt).toLocaleDateString("fr-FR")}
          </div>
        )}
      </Card>

      <Card>
        <div style={{ fontSize: "0.8rem", color: "var(--ph-text-muted)", fontWeight: 600, marginBottom: 10 }}>Contrats</div>
        {portfolio.contracts.length === 0 ? (
          <span style={{ color: "var(--ph-text-muted)", fontSize: "0.86rem" }}>Aucun contrat enregistré.</span>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {portfolio.contracts.map((contract) => (
              <div key={contract.id} style={{ borderTop: "1px solid var(--ph-border)", paddingTop: 8, fontSize: "0.85rem" }}>
                <strong>{CONTRACT_STATUS_LABEL[contract.status] ?? contract.status}</strong>
                <span style={{ marginLeft: 8, color: "var(--ph-text-muted)" }}>
                  {new Date(contract.startDate).toLocaleDateString("fr-FR")} → {new Date(contract.endDate).toLocaleDateString("fr-FR")}
                </span>
                {contract.rejectionReason && <div style={{ color: "var(--ph-text-muted)" }}>Motif : {contract.rejectionReason}</div>}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div style={{ fontSize: "0.8rem", color: "var(--ph-text-muted)", fontWeight: 600, marginBottom: 10 }}>Inscriptions</div>
        {portfolio.registrations.length === 0 ? (
          <span style={{ color: "var(--ph-text-muted)", fontSize: "0.86rem" }}>Aucune inscription enregistrée.</span>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {portfolio.registrations.map((registration) => (
              <div key={registration.id} style={{ borderTop: "1px solid var(--ph-border)", paddingTop: 8, fontSize: "0.85rem" }}>
                <strong>{REGISTRATION_STATUS_LABEL[registration.status] ?? registration.status}</strong>
                <span style={{ marginLeft: 8, color: "var(--ph-text-muted)" }}>Éligibilité : {registration.eligibilityStatus}</span>
                {registration.rejectionReason && <div style={{ color: "var(--ph-text-muted)" }}>Motif : {registration.rejectionReason}</div>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {availability.activeSuspension && (
        <Card>
          <div style={{ fontSize: "0.8rem", color: "var(--ph-text-muted)", fontWeight: 600, marginBottom: 10 }}>Suspension</div>
          <div style={{ fontSize: "0.9rem" }}>
            {availability.activeSuspension.matchesPurged} / {availability.activeSuspension.matchesCount} matchs purgés
          </div>
        </Card>
      )}
    </div>
  );
}
