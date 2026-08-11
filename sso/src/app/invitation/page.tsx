import AcceptInvitationForm from "@/components/AcceptInvitationForm";

export default async function InvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="sso-page">
      <div className="sso-card">
        <h1>Rejoindre votre club</h1>
        {token ? (
          <>
            <p className="sso-muted">Choisissez votre nom et votre mot de passe pour activer votre compte.</p>
            <AcceptInvitationForm token={token} />
          </>
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
          margin: 0 0 8px;
          font-size: 1.5rem;
        }
        .sso-muted {
          color: var(--sso-muted);
          font-size: 0.875rem;
          margin: 0 0 24px;
        }
        .sso-error {
          color: var(--sso-error);
          font-size: 0.9375rem;
        }
      `}</style>
    </div>
  );
}
