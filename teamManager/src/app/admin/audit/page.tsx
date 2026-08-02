import { AuditLogService } from "@/services/AuditLogService";

export const dynamic = "force-dynamic";

/**
 * Page Journal d'audit — port de cardManager/app/[locale]/admin/dashboard/audit.
 * Lecture seule, réservé aux comptes du club (mêmes filtres que cardManager).
 */
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entity?: string; from?: string; to?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10));

  const auditLogService = new AuditLogService();
  const { logs, total, pages } = await auditLogService.findAll(
    { action: params.action, entity: params.entity, from: params.from, to: params.to },
    page,
    50
  );

  const buildLink = (nextPage: number) => {
    const qs = new URLSearchParams();
    if (params.action) qs.set("action", params.action);
    if (params.entity) qs.set("entity", params.entity);
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);
    qs.set("page", String(nextPage));
    return `/admin/audit?${qs.toString()}`;
  };

  const smallInputClass =
    "rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none";

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Journal d&apos;audit</h1>

      <div className="bg-white rounded-lg shadow border border-gray-200 p-5 mb-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Action</label>
            <select name="action" className={smallInputClass} defaultValue={params.action ?? ""}>
              <option value="">Toutes</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Entité</label>
            <input type="text" name="entity" className={smallInputClass} defaultValue={params.entity ?? ""} placeholder="Card, Fine..." />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Du</label>
            <input type="date" name="from" className={smallInputClass} defaultValue={params.from ?? ""} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-0.5">Au</label>
            <input type="date" name="to" className={smallInputClass} defaultValue={params.to ?? ""} />
          </div>
          <div>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 transition-colors"
            >
              Filtrer
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="p-5">
          {logs.length === 0 ? (
            <p className="text-gray-500 text-center py-10 mb-0">Aucune entrée</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-gray-200 text-gray-500 uppercase text-xs tracking-wide">
                    <th className="p-2">Date</th>
                    <th className="p-2">Utilisateur</th>
                    <th className="p-2">Action</th>
                    <th className="p-2">Entité</th>
                    <th className="p-2">ID</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-2">{new Date(log.createdAt).toLocaleString("fr-TN")}</td>
                      <td className="p-2">{log.user?.name ?? log.userId}</td>
                      <td className="p-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            log.action === "CREATE"
                              ? "bg-green-100 text-green-800"
                              : log.action === "DELETE"
                                ? "bg-red-100 text-red-800"
                                : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="p-2">{log.entity}</td>
                      <td className="p-2 text-gray-500 text-xs">{log.entityId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {pages > 1 && (
          <div className="px-5 py-3 border-t border-gray-200 flex justify-between items-center">
            <span className="text-xs text-gray-500">
              Page {page} / {pages} ({total} entrées)
            </span>
            <div className="flex gap-2">
              <a
                className={`inline-flex items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1 text-sm transition-colors ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
                href={buildLink(page - 1)}
              >
                Précédent
              </a>
              <a
                className={`inline-flex items-center justify-center rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1 text-sm transition-colors ${page >= pages ? "pointer-events-none opacity-50" : ""}`}
                href={buildLink(page + 1)}
              >
                Suivant
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
