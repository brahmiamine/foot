import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/session";
import { listRecentSecurityEvents, type SecurityEventType } from "@/lib/securityLog";
import LogoutEverywhereButton from "@/components/LogoutEverywhereButton";

export const dynamic = "force-dynamic";

const EVENT_LABELS: Record<SecurityEventType, string> = {
  LOGIN_FAILED: "Tentative de connexion échouée",
  LOGIN_RATE_LIMITED: "Trop de tentatives de connexion",
  MFA_FAILED: "Code d'authentification à deux facteurs invalide",
  PASSWORD_RESET_REQUESTED: "Réinitialisation de mot de passe demandée",
  PASSWORD_RESET_COMPLETED: "Mot de passe réinitialisé (lien email)",
  PASSWORD_RESET_FAILED: "Échec de réinitialisation de mot de passe",
  PASSWORD_CHANGED: "Mot de passe changé",
  PASSWORD_CHANGE_FAILED: "Échec de changement de mot de passe",
};

function formatEventDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(date);
}

export default async function Home() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }

  const events = await listRecentSecurityEvents(session.id, session.email).catch((error) => {
    console.error("listRecentSecurityEvents failed on portal page:", error);
    return [];
  });

  return (
    <div className="sso-page">
      <div className="sso-card">
        <h1>Mon compte</h1>
        <dl className="sso-summary">
          <dt>Nom</dt>
          <dd>{session.name}</dd>
          <dt>Email</dt>
          <dd>{session.email}</dd>
          <dt>Rôle</dt>
          <dd>
            {session.role}
            {session.teamId ? ` · club ${session.teamId}` : ""}
          </dd>
        </dl>

        <section className="sso-section">
          <h2>Sécurité</h2>
          <ul className="sso-links">
            <li>
              <Link href="/account/password">Changer mon mot de passe</Link>
            </li>
            <li>
              <Link href="/account/sessions">Appareils et sessions</Link>
            </li>
            {session.role === "SUPERADMIN" && (
              <li>
                <Link href="/account/mfa">Authentification à deux facteurs</Link>
              </li>
            )}
            {session.role === "SUPERADMIN" && (
              <li>
                <Link href="/security-events">Journal de sécurité (tous comptes)</Link>
              </li>
            )}
            <li>
              <LogoutEverywhereButton />
            </li>
          </ul>
        </section>

        <section className="sso-section">
          <h2>Activité récente</h2>
          {events.length === 0 ? (
            <p className="sso-muted">Aucun événement récent.</p>
          ) : (
            <ul className="sso-events">
              {events.map((event, index) => (
                <li key={index}>
                  <span>{EVENT_LABELS[event.type]}</span>
                  <span className="sso-muted">
                    {formatEventDate(event.createdAt)}
                    {event.ip ? ` · ${event.ip}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="sso-muted">Revenez sur l&apos;application souhaitée — vous êtes déjà authentifié.</p>
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
          max-width: 480px;
          background: var(--sso-card);
          border: 1px solid var(--sso-border);
          border-radius: 12px;
          padding: 32px;
        }
        .sso-card h1 {
          margin: 0 0 16px;
          font-size: 1.5rem;
        }
        .sso-summary {
          display: grid;
          grid-template-columns: auto 1fr;
          gap: 4px 16px;
          margin: 0 0 24px;
          font-size: 0.9375rem;
        }
        .sso-summary dt {
          color: var(--sso-muted);
        }
        .sso-summary dd {
          margin: 0;
        }
        .sso-section {
          margin: 0 0 24px;
          padding-top: 20px;
          border-top: 1px solid var(--sso-border);
        }
        .sso-section h2 {
          margin: 0 0 12px;
          font-size: 1rem;
        }
        .sso-links {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .sso-links a {
          color: var(--sso-accent);
          font-size: 0.875rem;
        }
        .sso-events {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 0.8125rem;
        }
        .sso-events li {
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }
        .sso-muted {
          color: var(--sso-muted);
          font-size: 0.8125rem;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
