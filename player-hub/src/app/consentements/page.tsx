import { auth } from "@/lib/auth";
import { playerPortalService } from "@/services/PlayerPortalService";
import { ConsentForm } from "./ConsentForm";

/** PLAYER-004 — consentements/signatures joueur (contrat/transfert/licence/image/règlement) avec historique. */
export default async function ConsentementsPage() {
  const session = await auth();
  if (!session) return null;

  const consents = await playerPortalService.listMyConsents(session.user.playerId);

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <h1 style={{ fontSize: "1.2rem", margin: 0 }}>Mes consentements</h1>
      <ConsentForm
        consents={consents.map((c) => ({
          id: c.id,
          consentType: c.consentType,
          referenceId: c.referenceId ?? null,
          signedAt: c.signedAt.toISOString(),
        }))}
      />
    </div>
  );
}
