import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { sanitizeRedirect } from "@/lib/redirect";
import MemberLoginForm from "@/components/MemberLoginForm";

export default async function MemberLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const { redirect: redirectParam, error } = await searchParams;
  const target = sanitizeRedirect(redirectParam) ?? "/";

  const session = await getCurrentSession();
  if (session) {
    redirect(target);
  }

  return (
    <div className="sso-page">
      <div className="sso-card">
        <h1>Espace membre</h1>
        <p className="sso-muted">Connectez-vous pour accéder à votre espace membre.</p>
        <MemberLoginForm redirectTo={target} initialError={error ?? null} />
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
