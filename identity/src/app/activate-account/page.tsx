import ActivateAccountForm from "@/components/ActivateAccountForm";

export default async function ActivateAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="sso-page">
      <div className="sso-card">
        <h1>Activer mon compte</h1>
        <p className="sso-help">Choisissez votre mot de passe pour finaliser l&apos;accès à votre espace joueur.</p>
        {token ? (
          <ActivateAccountForm token={token} />
        ) : (
          <p className="sso-error">Lien invalide : jeton manquant.</p>
        )}
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
          max-width: 440px;
          background: var(--sso-card);
          border: 1px solid var(--sso-border);
          border-radius: 12px;
          padding: 32px;
        }
        .sso-card h1 { margin: 0 0 8px; font-size: 1.5rem; }
        .sso-help { margin: 0 0 20px; color: var(--sso-muted); font-size: 0.9375rem; }
        .sso-error { color: var(--sso-error); font-size: 0.9375rem; }
      `}</style>
    </div>
  );
}
