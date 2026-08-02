'use client'

import type { Dispatch, FormEvent, SetStateAction } from 'react'

interface ImportArbitresCardProps {
  setImportFile: Dispatch<SetStateAction<File | null>>
  importMessage: string | null
  importing: boolean
  onSubmit: (event: FormEvent) => void
}

export default function ImportArbitresCard({
  setImportFile,
  importMessage,
  importing,
  onSubmit,
}: ImportArbitresCardProps) {
  return (
    <div className="bg-white shadow rounded-lg p-5" id="import">
      <h3 className="text-xl font-semibold mb-4">Import CSV</h3>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm font-medium mb-1">Fichier CSV</label>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-1">
            Colonnes supportées: nom, nom_en, nom_ar, date_naissance, photo_url, id.
          </p>
        </div>
        {importMessage && <p className="text-sm text-blue-600">{importMessage}</p>}
        <button
          type="submit"
          className="btn btn-success w-100"
          disabled={importing}
        >
          {importing ? 'Import en cours...' : 'Importer'}
        </button>
      </form>
    </div>
  )
}
