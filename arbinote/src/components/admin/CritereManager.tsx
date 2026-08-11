'use client'

import CreateCritereForm from './criteres/CreateCritereForm'
import CriteresTable from './criteres/CriteresTable'
import EditCritereForm from './criteres/EditCritereForm'
import { useCriteres } from './criteres/useCriteres'

export default function CritereManager() {
  const {
    loading,
    error,
    createForm,
    setCreateForm,
    editForm,
    setEditForm,
    editingId,
    showCreateForm,
    setShowCreateForm,
    submitting,
    deletingId,
    sortedCriteres,
    loadCriteres,
    resetCreateForm,
    resetEditForm,
    startEdit,
    handleCreate,
    handleUpdate,
    handleDelete,
  } = useCriteres()

  return (
    <div className="space-y-6">
      {/* Header avec bouton Ajouter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">Gestion des critères</h2>
          <p className="text-gray-500">Liste et modification des critères d&apos;évaluation</p>
        </div>
        <button
          onClick={() => {
            setShowCreateForm(!showCreateForm)
            if (showCreateForm) {
              resetCreateForm()
            } else {
              resetEditForm()
            }
          }}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          {showCreateForm ? 'Annuler' : '+ Ajouter un critère'}
        </button>
      </div>

      {error && (
        <div className="p-3 border border-red-200 bg-red-50 text-red-700 rounded">{error}</div>
      )}

      {/* Formulaire de création dans la page */}
      {showCreateForm && (
        <CreateCritereForm
          createForm={createForm}
          setCreateForm={setCreateForm}
          submitting={submitting}
          onSubmit={handleCreate}
          onClose={resetCreateForm}
        />
      )}

      {/* Layout principal : Liste à droite (col-8) et Formulaire de modification à gauche (col-4) */}
      <div className="grid grid-cols-12 gap-6">
        {/* Liste des critères à droite (col-8 ou col-12 si pas de formulaire) */}
        <CriteresTable
          sortedCriteres={sortedCriteres}
          loading={loading}
          editingId={editingId}
          onRefresh={loadCriteres}
          onStartEdit={startEdit}
        />

        {/* Formulaire de modification à gauche (col-4) */}
        {editingId && (
          <EditCritereForm
            editForm={editForm}
            setEditForm={setEditForm}
            submitting={submitting}
            editingId={editingId}
            deletingId={deletingId}
            onSubmit={handleUpdate}
            onClose={resetEditForm}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  )
}
