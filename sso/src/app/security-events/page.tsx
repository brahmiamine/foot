import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";
import { listSecurityEventsForAdmin } from "@/lib/securityLog";
import SecurityEventsTable from "@/components/SecurityEventsTable";

export const dynamic = "force-dynamic";

/**
 * Viewer admin pour security_events (voir avancement.md, "sso" — pas de
 * viewer admin pour le journal de sécurité). Réservé SUPERADMIN, distinct
 * de la section "Activité récente" de `/` (qui ne montre que les
 * événements de l'utilisateur connecté).
 */
export default async function SecurityEventsPage() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }
  if (session.role !== "SUPERADMIN") {
    redirect("/");
  }

  const initial = await listSecurityEventsForAdmin({ limit: 25, offset: 0 });
  const initialEvents = initial.events.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() }));

  return (
    <div className="sso-page">
      <div className="sso-card">
        <h1>Journal de sécurité</h1>
        <p className="sso-muted">
          Connexions échouées, réinitialisations, MFA — tous comptes confondus.
        </p>
        <SecurityEventsTable initialEvents={initialEvents} initialTotal={initial.total} />
      </div>
      <style>{`
        .sso-page {
          min-height: 100vh;
          padding: 24px;
          display: flex;
          justify-content: center;
        }
        .sso-card {
          width: 100%;
          max-width: 900px;
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
