'use client'

import CreateLeagueForm from './leagues/CreateLeagueForm'
import EditLeagueForm from './leagues/EditLeagueForm'
import LeaguesTable from './leagues/LeaguesTable'
import LogoViewerModal from './leagues/LogoViewerModal'
import { emptyForm } from './leagues/constants'
import { useAdminLeagues } from './leagues/useAdminLeagues'

export default function AdminLeaguesManager() {
  const {
    federations,
    loading,
    error,
    createForm,
    setCreateForm,
    editForm,
    setEditForm,
    editingId,
    showCreateModal,
    setShowCreateModal,
    uploadingCreate,
    uploadingEdit,
    viewingLogo,
    setViewingLogo,
    searchQuery,
    setSearchQuery,
    filterFederationId,
    setFilterFederationId,
    imageErrors,
    filteredAndSortedLeagues,
    handleFileChange,
    handleCreate,
    startEdit,
    cancelEdit,
    handleUpdate,
    handleDelete,
    handleToggleActive,
    markImageError,
  } = useAdminLeagues()

  if (loading) {
    return <div className="text-center py-4">Chargement...</div>
  }

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-md-between gap-3">
        <div>
          <h2 className="mb-1">Gestion des ligues</h2>
          <p className="text-muted mb-0">Liste et modification des ligues</p>
        </div>
        <button
          onClick={() => setShowCreateModal(!showCreateModal)}
          className="btn btn-primary"
        >
          {showCreateModal ? 'Annuler' : '+ Ajouter une ligue'}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger mb-0">{error}</div>
      )}

      {showCreateModal && (
        <CreateLeagueForm
          federations={federations}
          createForm={createForm}
          setCreateForm={setCreateForm}
          uploadingCreate={uploadingCreate}
          onSubmit={handleCreate}
          onFileChange={handleFileChange(setCreateForm)}
          onClose={() => {
            setShowCreateModal(false)
            setCreateForm({ ...emptyForm })
          }}
        />
      )}

      <div className="row g-4">
        <LeaguesTable
          leagues={filteredAndSortedLeagues}
          federations={federations}
          editingId={editingId}
          imageErrors={imageErrors}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterFederationId={filterFederationId}
          setFilterFederationId={setFilterFederationId}
          onViewLogo={setViewingLogo}
          onImageError={markImageError}
          onStartEdit={startEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
        />

        {editingId && (
          <EditLeagueForm
            federations={federations}
            editForm={editForm}
            setEditForm={setEditForm}
            editingId={editingId}
            uploadingEdit={uploadingEdit}
            imageErrors={imageErrors}
            onSubmit={handleUpdate}
            onFileChange={handleFileChange(setEditForm)}
            onViewLogo={setViewingLogo}
            onImageError={markImageError}
            onClose={cancelEdit}
          />
        )}
      </div>

      {viewingLogo && (
        <LogoViewerModal viewingLogo={viewingLogo} onClose={() => setViewingLogo(null)} />
      )}
    </div>
  )
}
