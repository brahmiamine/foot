import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { getMemberProfile } from "@/lib/members";
import { sanitizeRedirect } from "@/lib/redirect";
import MemberProfileForm from "@/components/MemberProfileForm";

export const dynamic = "force-dynamic";

/**
 * « Compléter mon profil » — pour un MEMBER inscrit sans firstName/lastName/
 * phoneNumber (connexion Google, ou champs laissés vides à l'inscription).
 * Ces champs ne servent qu'à `billetterie` pour payer via Paymee (voir
 * lib/members.ts) ; page volontairement à part de la page d'accueil `/`
 * (réservée aux comptes staff/SUPERADMIN aujourd'hui), sous /membre/ comme
 * /membre/login et /membre/register.
 */
export default async function MemberProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) {
    redirect(`/membre/login?redirect=${encodeURIComponent("/membre/profil")}`);
  }
  if (session.role !== "MEMBER") {
    redirect("/");
  }

  const { redirect: redirectParam } = await searchParams;
  const redirectTo = sanitizeRedirect(redirectParam);
  const profile = await getMemberProfile(session.id);

  return (
    <div className="sso-page">
      <div className="sso-card">
        <h1>Mon profil</h1>
        <p className="sso-muted">
          Prénom, nom et téléphone sont nécessaires pour payer un billet par Paymee sur la billetterie.
        </p>
        <MemberProfileForm
          initialFirstName={profile?.firstName ?? ""}
          initialLastName={profile?.lastName ?? ""}
          initialPhoneNumber={profile?.phoneNumber ?? ""}
          redirectTo={redirectTo}
        />
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
          max-width: 420px;
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
