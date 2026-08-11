import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/session";
import { getDataSource } from "@/lib/db";
import { SecurityLog } from "@/entities/SecurityLog";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

const EVENT_LABELS: Record<string, string> = {
  LOGIN_FAILED: "Login échoué",
  LOGIN_RATE_LIMITED: "Rate limit login",
  INVALID_TOKEN: "Jeton invalide/expiré",
  PASSWORD_RESET_REQUESTED: "Mot de passe oublié demandé",
  MFA_ENABLED: "MFA activée",
  MFA_DISABLED: "MFA désactivée",
  MFA_VERIFY_FAILED: "Code MFA invalide",
  SESSION_REVOKED: "Sessions révoquées",
};

function formatDate(date: Date): string {
  return new Date(date).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "medium" });
}

/**
 * Vue de lecture du journal de sécurité (voir SecurityLog) — réservée à
 * SUPERADMIN, même gating que /account/mfa. Pagination simple par lien
 * page=N (pas de filtrage/recherche : volume attendu faible, pas de besoin
 * constaté au-delà de la pagination).
 */
export default async function SecurityLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }
  if (session.role !== "SUPERADMIN") {
    redirect("/");
  }

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);

  const dataSource = await getDataSource();
  const repo = dataSource.getRepository(SecurityLog);
  const [entries, total] = await repo.findAndCount({
    order: { createdAt: "DESC" },
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="sso-admin-page">
      <h1>Journal de sécurité</h1>
      <p className="sso-muted">
        {total} événement{total > 1 ? "s" : ""} — page {page}/{totalPages}
      </p>

      <div className="sso-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Événement</th>
              <th>Email</th>
              <th>Utilisateur</th>
              <th>IP</th>
              <th>Détail</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="sso-empty">
                  Aucun événement enregistré.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDate(entry.createdAt)}</td>
                  <td>{EVENT_LABELS[entry.eventType] ?? entry.eventType}</td>
                  <td>{entry.email ?? "—"}</td>
                  <td>{entry.userId ?? "—"}</td>
                  <td>{entry.ip ?? "—"}</td>
                  <td>{entry.detail ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="sso-pager">
        {page > 1 && <Link href={`/admin/security-logs?page=${page - 1}`}>← Précédent</Link>}
        {page < totalPages && <Link href={`/admin/security-logs?page=${page + 1}`}>Suivant →</Link>}
      </div>

      <style>{`
        .sso-admin-page {
          max-width: 1100px;
          margin: 0 auto;
          padding: 32px 24px;
        }
        .sso-admin-page h1 {
          margin: 0 0 8px;
          font-size: 1.5rem;
        }
        .sso-muted {
          color: var(--sso-muted);
          font-size: 0.875rem;
          margin: 0 0 24px;
        }
        .sso-table-wrap {
          overflow-x: auto;
          border: 1px solid var(--sso-border);
          border-radius: 12px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }
        th, td {
          text-align: left;
          padding: 10px 14px;
          border-bottom: 1px solid var(--sso-border);
          white-space: nowrap;
        }
        th {
          color: var(--sso-muted);
          font-weight: 600;
          background: var(--sso-card);
        }
        tr:last-child td {
          border-bottom: none;
        }
        .sso-empty {
          text-align: center;
          color: var(--sso-muted);
          white-space: normal;
        }
        .sso-pager {
          display: flex;
          justify-content: space-between;
          margin-top: 16px;
          font-size: 0.875rem;
        }
        .sso-pager a {
          color: var(--sso-accent);
          text-decoration: none;
        }
        .sso-pager a:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
