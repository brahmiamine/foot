'use client'

import CreateJourneeForm from './journees/CreateJourneeForm'
import EditJourneeForm from './journees/EditJourneeForm'
import JourneesTable from './journees/JourneesTable'
import { emptyForm } from './journees/constants'
import { useAdminJournees } from './journees/useAdminJournees'

export default function AdminJourneesManager() {
  const {
    saisons,
    loading,
    error,
    createForm,
    setCreateForm,
    editForm,
    setEditForm,
    editingId,
    showCreateForm,
    setShowCreateForm,
    savingId,
    creating,
    deletingId,
    searchQuery,
    setSearchQuery,
    filterSaisonId,
    setFilterSaisonId,
    filteredAndSortedJournees,
    startEdit,
    cancelEdit,
    handleCreate,
    handleUpdate,
    handleDelete,
  } = useAdminJournees()

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-md-between gap-3">
        <div>
          <h2 className="mb-1">Gestion des journées</h2>
          <p className="text-muted mb-0">Liste et modification des journées</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn btn-primary"
        >
          {showCreateForm ? 'Annuler' : '+ Ajouter une journée'}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger mb-0">{error}</div>
      )}

      {showCreateForm && (
        <CreateJourneeForm
          createForm={createForm}
          setCreateForm={setCreateForm}
          creating={creating}
          saisons={saisons}
          onSubmit={handleCreate}
          onClose={() => {
            setShowCreateForm(false)
            setCreateForm(emptyForm)
          }}
        />
      )}

      <div className="row g-4">
        <JourneesTable
          journees={filteredAndSortedJournees}
          saisons={saisons}
          loading={loading}
          editingId={editingId}
          deletingId={deletingId}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterSaisonId={filterSaisonId}
          setFilterSaisonId={setFilterSaisonId}
          onStartEdit={startEdit}
          onDelete={handleDelete}
        />

        {editingId && (
          <EditJourneeForm
            editForm={editForm}
            setEditForm={setEditForm}
            savingId={savingId}
            editingId={editingId}
            saisons={saisons}
            onSubmit={handleUpdate}
            onClose={cancelEdit}
          />
        )}
      </div>
    </div>
  )
}
