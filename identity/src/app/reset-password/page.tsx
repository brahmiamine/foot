import ResetPasswordForm from "@/components/ResetPasswordForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="sso-page">
      <div className="sso-card">
        <h1>Réinitialiser le mot de passe</h1>
        {token ? (
          <ResetPasswordForm token={token} />
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
          max-width: 420px;
          background: var(--sso-card);
          border: 1px solid var(--sso-border);
          border-radius: 12px;
          padding: 32px;
        }
        .sso-card h1 {
          margin: 0 0 16px;
          font-size: 1.5rem;
        }
        .sso-error {
          color: var(--sso-error);
          font-size: 0.9375rem;
        }
      `}</style>
    </div>
  );
}
