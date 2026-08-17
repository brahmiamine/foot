import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { getDataSource } from "@/lib/db";
import { User } from "@/entities/User";
import { getMfaRolePolicy } from "@/lib/mfaPolicy";
import MfaSetupForm from "@/components/MfaSetupForm";

export const dynamic = "force-dynamic";

export default async function AccountMfaPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const policy = await getMfaRolePolicy(session.role);
  if (policy.mode === "DISABLED") redirect("/");

  const dataSource = await getDataSource();
  const user = await dataSource.getRepository(User).findOne({ where: { id: session.id } });
  const mfaEnabled = Boolean(user?.mfaEnabled && user?.mfaSecret);

  return (
    <div className="sso-page">
      <div className="sso-card">
        <h1>Authentification à deux facteurs</h1>
        <p className="sso-muted">
          Protégez votre compte avec une application d&apos;authentification en plus de votre mot de passe.
        </p>
        <MfaSetupForm initialEnabled={mfaEnabled} disableAllowed={policy.mode !== "REQUIRED"} />
      </div>
      <style>{`
        .sso-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .sso-card { width: 100%; max-width: 460px; background: var(--sso-card); border: 1px solid var(--sso-border); border-radius: 12px; padding: 32px; }
        .sso-card h1 { margin: 0 0 8px; font-size: 1.5rem; }
        .sso-muted { color: var(--sso-muted); font-size: 0.875rem; margin: 0 0 24px; }
      `}</style>
    </div>
  );
}
