const EXPORTS = [
  { key: "cards", label: "Historique des cartons" },
  { key: "fines", label: "Récapitulatif des amendes" },
  { key: "suspensions", label: "Suspensions actives" },
  { key: "players", label: "Liste des joueurs" },
] as const;

/** Page Exports — port de cardManager/app/[locale]/admin/dashboard/exports. */
export default function ExportsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Exports</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {EXPORTS.map((exp) => (
          <div className="bg-white rounded-lg shadow border border-gray-200 flex flex-col" key={exp.key}>
            <div className="p-5 flex flex-col flex-1">
              <h5 className="text-lg font-semibold mb-auto">{exp.label}</h5>
              <div className="flex gap-2 pt-4">
                <a
                  href={`/api/exports/${exp.key}?format=excel`}
                  className="inline-flex items-center justify-center rounded-md border border-blue-600 text-blue-600 hover:bg-blue-50 px-3 py-1.5 text-sm transition-colors"
                >
                  <i className="fas fa-file-excel mr-2" aria-hidden="true" />
                  Excel
                </a>
                <a
                  href={`/api/exports/${exp.key}?format=pdf`}
                  className="inline-flex items-center justify-center rounded-md border border-red-300 text-red-600 hover:bg-red-50 px-3 py-1.5 text-sm transition-colors"
                >
                  <i className="fas fa-file-pdf mr-2" aria-hidden="true" />
                  PDF
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
