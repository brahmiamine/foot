const EXPORTS = [
  { key: "cards", label: "Historique des cartons" },
  { key: "fines", label: "Récapitulatif des amendes" },
  { key: "suspensions", label: "Suspensions actives" },
  { key: "players", label: "Liste des joueurs" },
] as const;

/** Page Exports — port de cardManager/app/[locale]/admin/dashboard/exports. */
export default function ExportsPage() {
  return (
    <div className="container-fluid px-0">
      <h1 className="h4 mb-4">Exports</h1>
      <div className="row g-3">
        {EXPORTS.map((exp) => (
          <div className="col-12 col-md-6" key={exp.key}>
            <div className="card h-100">
              <div className="card-body d-flex flex-column">
                <h5 className="card-title mb-auto">{exp.label}</h5>
                <div className="d-flex gap-2 pt-3">
                <a
                  href={`/api/exports/${exp.key}?format=excel`}
                  className="btn btn-sm btn-outline-primary"
                >
                  <i className="fas fa-file-excel me-2" aria-hidden="true" />
                  Excel
                </a>
                <a
                  href={`/api/exports/${exp.key}?format=pdf`}
                  className="btn btn-sm btn-outline-danger"
                >
                  <i className="fas fa-file-pdf me-2" aria-hidden="true" />
                  PDF
                </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
