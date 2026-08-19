import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { sanitizeRedirect } from "@/lib/redirect";
import MemberRegisterForm from "@/components/MemberRegisterForm";

export default async function MemberRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; teamId?: string; invite?: string }>;
}) {
  const { redirect: redirectParam, teamId: teamIdParam, invite: invitationToken } = await searchParams;
  const target = sanitizeRedirect(redirectParam) ?? "/";
  const teamId = typeof teamIdParam === "string" && teamIdParam.trim() ? teamIdParam.trim() : null;

  const session = await getCurrentSession();
  if (session) {
    redirect(target);
  }

  return (
    <div className="sso-page">
      <div className="sso-card">
        <h1>Créer un compte</h1>
        <p className="sso-muted">Rejoignez l&apos;espace membre en quelques secondes.</p>
        <MemberRegisterForm
          redirectTo={target}
          teamId={teamId}
          invitationToken={invitationToken ?? null}
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
