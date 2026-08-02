import type { EditModalData } from './types'

interface EditVoteModalProps {
  editModal: EditModalData
  setEditModal: (data: EditModalData) => void
  saving: boolean
  saveEdit: () => void
  onClose: () => void
}

export default function EditVoteModal({
  editModal,
  setEditModal,
  saving,
  saveEdit,
  onClose,
}: EditVoteModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">Modifier le vote</h2>
          <div className="mb-4 p-3 bg-gray-50 rounded">
            <p className="text-sm text-gray-600"><strong>Match:</strong> {editModal.vote.match.equipe_home.nom} vs {editModal.vote.match.equipe_away.nom}</p>
            <p className="text-sm text-gray-600"><strong>Arbitre:</strong> {editModal.vote.arbitre.nom}</p>
          </div>
          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-700">Criteres (1-10):</p>
            {Object.entries(editModal.criteres).map(([key, value]) => (
              <div key={key} className="flex items-center gap-3">
                <label className="flex-1 text-sm text-gray-600">{key.replace(/_/g, ' ')}</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  step="0.5"
                  value={value}
                  onChange={(e) => {
                    const newValue = parseFloat(e.target.value) || 0
                    setEditModal({
                      ...editModal,
                      criteres: { ...editModal.criteres, [key]: Math.min(10, Math.max(1, newValue)) },
                    })
                  }}
                  className="w-20 border rounded px-2 py-1 text-sm text-center"
                />
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-50">Annuler</button>
            <button onClick={saveEdit} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
