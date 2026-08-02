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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Importer des équipes</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm">
            <p className="font-medium text-blue-800 mb-2">Format JSON attendu :</p>
            <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
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
            <button
              onClick={onDownloadSample}
              className="btn btn-sm btn-link text-primary p-0 mt-2"
            >
              📄 Télécharger un fichier exemple
            </button>
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={onFileSelect}
              className="hidden"
              id="json-import"
            />
            <label
              htmlFor="json-import"
              className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                importing
                  ? 'bg-gray-100 border-gray-300 cursor-wait'
                  : 'bg-gray-50 border-gray-300 hover:bg-gray-100 hover:border-blue-400'
              }`}
            >
              {importing ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="text-gray-600">Import en cours...</span>
                </div>
              ) : (
                <>
                  <span className="text-3xl mb-2">📁</span>
                  <span className="text-gray-600">Cliquez pour sélectionner un fichier JSON</span>
                  <span className="text-gray-400 text-sm">ou glissez-déposez ici</span>
                </>
              )}
            </label>
          </div>

          {/* Résultat de l'import */}
          {importResult && (
            <div className={`p-4 rounded border ${
              importResult.imported > 0 && importResult.skipped === 0
                ? 'bg-green-50 border-green-200'
                : importResult.imported > 0
                ? 'bg-yellow-50 border-yellow-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <p className="font-medium mb-2">
                {importResult.imported > 0 ? '✅' : '⚠️'} Résultat de l&apos;import
              </p>
              <ul className="text-sm space-y-1">
                <li>Total : {importResult.total} équipe(s)</li>
                <li className="text-green-700">Importées : {importResult.imported}</li>
                {importResult.skipped > 0 && (
                  <li className="text-orange-700">Ignorées : {importResult.skipped}</li>
                )}
              </ul>
              {importResult.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-red-700">Erreurs :</p>
                  <ul className="text-xs text-red-600 mt-1 max-h-24 overflow-y-auto">
                    {importResult.errors.map((err, i) => (
                      <li key={i}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {error && !importResult && (
            <div className="p-3 border border-red-200 bg-red-50 text-red-700 rounded text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="btn btn-light"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
