import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { sanitizeRedirect } from "@/lib/redirect";
import MfaStepUpForm from "@/components/MfaStepUpForm";

export const dynamic = "force-dynamic";

export default async function MfaStepUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const { redirect: requestedRedirect } = await searchParams;
  const redirectTo = sanitizeRedirect(requestedRedirect ?? null) ?? "/";

  return (
    <div className="sso-page">
      <div className="sso-card">
        <h1>Vérification de sécurité</h1>
        <p className="sso-muted">
          Cette action sensible exige une authentification à deux facteurs récente.
        </p>
        <MfaStepUpForm redirectTo={redirectTo} />
      </div>
      <style>{`
        .sso-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .sso-card { width: 100%; max-width: 440px; background: var(--sso-card); border: 1px solid var(--sso-border); border-radius: 12px; padding: 32px; }
        .sso-card h1 { margin: 0 0 8px; font-size: 1.5rem; }
        .sso-muted { margin: 0 0 20px; color: var(--sso-muted); font-size: 0.9375rem; }
      `}</style>
    </div>
  );
}
