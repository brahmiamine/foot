import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { listUserSessions } from "@/lib/sessionRegistry";
import SessionManager from "@/components/SessionManager";

export const dynamic = "force-dynamic";

export default async function AccountSessionsPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const sessions = await listUserSessions(session.id, session.tokenVersion, session.sessionId);
  const serializableSessions = sessions.map((item) => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
    lastSeenAt: item.lastSeenAt.toISOString(),
    expiresAt: item.expiresAt.toISOString(),
  }));

  return (
    <div className="sso-page">
      <div className="sso-card">
        <div className="sso-heading">
          <div>
            <h1>Appareils et sessions</h1>
            <p className="sso-muted">
              Consultez les connexions actives de votre compte et déconnectez un appareil à distance.
            </p>
          </div>
          <Link href="/">Retour</Link>
        </div>

        {!session.sessionId && (
          <p className="sso-notice">
            Cette connexion a été créée avant l&apos;activation de la gestion des appareils. Elle reste protégée par la révocation globale et expirera automatiquement au plus tard 12 heures après son émission.
          </p>
        )}

        <SessionManager initialSessions={serializableSessions} />
      </div>
      <style>{`
        .sso-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .sso-card { width: 100%; max-width: 760px; background: var(--sso-card); border: 1px solid var(--sso-border); border-radius: 12px; padding: 32px; }
        .sso-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
        .sso-heading h1 { margin: 0 0 8px; font-size: 1.5rem; }
        .sso-heading a { color: var(--sso-accent); font-size: 0.875rem; white-space: nowrap; }
        .sso-muted { color: var(--sso-muted); font-size: 0.875rem; margin: 0; }
        .sso-notice { margin: 0 0 20px; padding: 12px 14px; border: 1px solid var(--sso-border); border-radius: 8px; color: var(--sso-muted); font-size: 0.8125rem; line-height: 1.45; }
        @media (max-width: 560px) { .sso-card { padding: 22px; } .sso-heading { flex-direction: column; } }
      `}</style>
    </div>
  );
}
