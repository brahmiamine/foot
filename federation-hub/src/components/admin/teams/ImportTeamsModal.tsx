'use client'

import type { RefObject } from 'react'
import type { ImportResult } from './types'

interface ImportTeamsModalProps {
  importing: boolean
  importResult: ImportResult | null
  error: string | null
  fileInputRef: RefObject<HTMLInputElement | null>
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDownloadSample: () => void
  onClose: () => void
}

export default function ImportTeamsModal({
  importing,
  importResult,
  error,
  fileInputRef,
  onFileSelect,
  onDownloadSample,
  onClose,
}: ImportTeamsModalProps) {
  return (
    <>
      <div className="modal fade show d-block" tabIndex={-1} role="dialog">
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Importer des équipes</h5>
              <button type="button" onClick={onClose} className="btn-close" aria-label="Fermer" />
            </div>
            <div className="modal-body">
              <div className="alert alert-info">
                <p className="fw-medium mb-2">Format JSON attendu :</p>
                <pre className="bg-white p-2 rounded border small mb-2" style={{ overflowX: 'auto' }}>
{`{
  "teams": [
    {
      "nom": "Nom de l'équipe",
      "nom_en": "Team Name",
      "nom_ar": "اسم الفريق",
      "abbr": "ABR",
      "team_type": "club|national",
      "country_code": "TUN",
      "sport": "football|handball|...",
      "age_category": "seniors|u21|...",
      "city": "Ville",
      "stadium": "Stade"
    }
  ]
}`}
                </pre>
                <button type="button" onClick={onDownloadSample} className="btn btn-sm btn-link text-primary p-0">
                  <i className="bx bx-download me-1" aria-hidden="true" />
                  Télécharger un fichier exemple
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={onFileSelect}
                className="d-none"
                id="json-import"
              />
              <label
                htmlFor="json-import"
                className={`d-flex flex-column align-items-center justify-content-center w-100 rounded border border-2 border-dashed py-4 ${
                  importing ? 'bg-light' : 'bg-light-subtle'
                }`}
                style={{ cursor: importing ? 'wait' : 'pointer' }}
              >
                {importing ? (
                  <div className="d-flex align-items-center gap-2">
                    <span className="spinner-border spinner-border-sm text-primary" role="status" aria-hidden="true" />
                    <span className="text-muted">Import en cours...</span>
                  </div>
                ) : (
                  <>
                    <i className="bx bx-cloud-upload fs-1 text-muted mb-1" aria-hidden="true" />
                    <span className="text-muted">Cliquez pour sélectionner un fichier JSON</span>
                    <span className="text-muted small">ou glissez-déposez ici</span>
                  </>
                )}
              </label>

              {importResult && (
                <div
                  className={`alert mt-3 mb-0 ${
                    importResult.imported > 0 && importResult.skipped === 0
                      ? 'alert-success'
                      : importResult.imported > 0
                        ? 'alert-warning'
                        : 'alert-danger'
                  }`}
                >
                  <p className="fw-medium mb-2">
                    <i className={`bx ${importResult.imported > 0 ? 'bx-check-circle' : 'bx-error'} me-1`} aria-hidden="true" />
                    Résultat de l&apos;import
                  </p>
                  <ul className="small mb-0 ps-3">
                    <li>Total : {importResult.total} équipe(s)</li>
                    <li className="text-success">Importées : {importResult.imported}</li>
                    {importResult.skipped > 0 && (
                      <li className="text-warning">Ignorées : {importResult.skipped}</li>
                    )}
                  </ul>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2">
                      <p className="small fw-medium text-danger mb-1">Erreurs :</p>
                      <ul className="small text-danger mb-0 ps-3" style={{ maxHeight: '6rem', overflowY: 'auto' }}>
                        {importResult.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {error && !importResult && (
                <div className="alert alert-danger mt-3 mb-0">{error}</div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" onClick={onClose} className="btn btn-light">
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" />
    </>
  )
}
