import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import InviteStaffForm from "@/components/InviteStaffForm";

export const dynamic = "force-dynamic";

/**
 * Déclencheur de l'invitation club — réservé à SUPERADMIN (n'importe quel
 * club) et ADMIN (son propre club uniquement), même gating que
 * /account/mfa. L'émission/vérification du jeton reste dans
 * src/lib/clubInvitations.ts (sso possède `User`) ; voir aussi
 * teamManager/admin/users, qui reste l'écran où le président du club crée
 * un compte "à la main" (mot de passe choisi par lui) — cette page couvre
 * le cas où la personne invitée doit choisir son propre mot de passe.
 */
export default async function InvitationsAdminPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }
  if (session.role !== "SUPERADMIN" && session.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="sso-page">
      <div className="sso-card">
        <h1>Inviter un membre du staff</h1>
        <p className="sso-muted">
          Envoie un lien à usage unique (valable 7 jours) : la personne invitée choisit elle-même son mot de passe.
        </p>
        <InviteStaffForm isSuperAdmin={session.role === "SUPERADMIN"} ownTeamId={session.teamId} />
      </div>
      <style>{`
        .sso-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .sso-card {
          width: 100%;
          max-width: 460px;
          background: var(--sso-card);
          border: 1px solid var(--sso-border);
          border-radius: 12px;
          padding: 32px;
        }
        .sso-card h1 {
          margin: 0 0 8px;
          font-size: 1.5rem;
        }
        .sso-muted {
          color: var(--sso-muted);
          font-size: 0.875rem;
          margin: 0 0 24px;
        }
      `}</style>
    </div>
  );
}
