'use client'

import CreateSaisonForm from './saisons/CreateSaisonForm'
import EditSaisonForm from './saisons/EditSaisonForm'
import SaisonsTable from './saisons/SaisonsTable'
import { emptyForm } from './saisons/constants'
import { useAdminSaisons } from './saisons/useAdminSaisons'

export default function AdminSaisonsManager() {
  const {
    leagues,
    federations,
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
    filterType,
    setFilterType,
    filterFederationId,
    setFilterFederationId,
    filterLeagueId,
    setFilterLeagueId,
    filteredLeagues,
    filteredAndSortedSaisons,
    startEdit,
    cancelEdit,
    handleCreate,
    handleUpdate,
    handleDelete,
  } = useAdminSaisons()

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-md-between gap-3">
        <div>
          <h2 className="mb-1">Gestion des saisons</h2>
          <p className="text-muted mb-0">Liste et modification des saisons</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn btn-primary"
        >
          {showCreateForm ? 'Annuler' : '+ Ajouter une saison'}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger mb-0">{error}</div>
      )}

      {showCreateForm && (
        <CreateSaisonForm
          createForm={createForm}
          setCreateForm={setCreateForm}
          leagues={leagues}
          creating={creating}
          onSubmit={handleCreate}
          onClose={() => {
            setShowCreateForm(false)
            setCreateForm(emptyForm)
          }}
        />
      )}

      <div className="row g-4">
        <SaisonsTable
          saisons={filteredAndSortedSaisons}
          federations={federations}
          filteredLeagues={filteredLeagues}
          loading={loading}
          editingId={editingId}
          deletingId={deletingId}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterType={filterType}
          setFilterType={setFilterType}
          filterFederationId={filterFederationId}
          setFilterFederationId={setFilterFederationId}
          filterLeagueId={filterLeagueId}
          setFilterLeagueId={setFilterLeagueId}
          onStartEdit={startEdit}
          onDelete={handleDelete}
        />

        {editingId && (
          <EditSaisonForm
            editForm={editForm}
            setEditForm={setEditForm}
            leagues={leagues}
            savingId={savingId}
            editingId={editingId}
            onSubmit={handleUpdate}
            onClose={cancelEdit}
          />
        )}
      </div>
    </div>
  )
}
