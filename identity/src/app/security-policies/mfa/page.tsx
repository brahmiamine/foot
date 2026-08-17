import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { listMfaRolePolicies } from "@/lib/mfaPolicy";
import MfaPolicyManager from "@/components/MfaPolicyManager";

export const dynamic = "force-dynamic";

export default async function MfaPoliciesPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  if (session.role !== "SUPERADMIN" && session.role !== "PLATFORM_SUPERADMIN") redirect("/");

  const policies = (await listMfaRolePolicies()).map((policy) => ({
    ...policy,
    updatedAt: policy.updatedAt?.toISOString() ?? null,
    graceEndsAt: policy.graceEndsAt?.toISOString() ?? null,
  }));

  return (
    <div className="sso-page">
      <div className="sso-card wide">
        <h1>Politiques MFA</h1>
        <p className="sso-muted">
          Définissez l&apos;exigence MFA par rôle. Les comptes déjà protégés continuent à être challengés même si une policy devient plus permissive.
        </p>
        <MfaPolicyManager initialPolicies={policies} />
      </div>
      <style>{`
        .sso-page { min-height: 100vh; padding: 32px; display: flex; justify-content: center; }
        .sso-card.wide { width: 100%; max-width: 980px; background: var(--sso-card); border: 1px solid var(--sso-border); border-radius: 12px; padding: 28px; }
        .sso-card h1 { margin: 0 0 8px; }
        .sso-muted { color: var(--sso-muted); margin: 0 0 24px; }
      `}</style>
    </div>
  );
}
