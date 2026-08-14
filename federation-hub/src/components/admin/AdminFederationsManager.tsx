'use client'

import CreateFederationForm from './federations/CreateFederationForm'
import EditFederationForm from './federations/EditFederationForm'
import FederationsTable from './federations/FederationsTable'
import LogoViewerModal from './federations/LogoViewerModal'
import { emptyForm } from './federations/constants'
import { useAdminFederations } from './federations/useAdminFederations'

export default function AdminFederationsManager() {
  const {
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
    imageErrors,
    setImageErrors,
    filteredAndSortedFederations,
    handleFileChange,
    handleCreate,
    startEdit,
    cancelEdit,
    handleUpdate,
    handleDelete,
    handleToggleActive,
  } = useAdminFederations()

  if (loading) {
    return <div className="text-center py-4">Chargement...</div>
  }

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-md-between gap-3">
        <div>
          <h2 className="mb-1">Gestion des fédérations</h2>
          <p className="text-muted mb-0">Liste et modification des fédérations</p>
        </div>
        <button
          onClick={() => setShowCreateModal(!showCreateModal)}
          className="btn btn-primary"
        >
          {showCreateModal ? 'Annuler' : '+ Ajouter une fédération'}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger mb-0">{error}</div>
      )}

      {showCreateModal && (
        <CreateFederationForm
          createForm={createForm}
          setCreateForm={setCreateForm}
          uploadingCreate={uploadingCreate}
          onSubmit={handleCreate}
          onClose={() => {
            setShowCreateModal(false)
            setCreateForm({ ...emptyForm })
          }}
          onFileChange={handleFileChange(setCreateForm)}
        />
      )}

      <div className="row g-4">
        <FederationsTable
          federations={filteredAndSortedFederations}
          editingId={editingId}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          imageErrors={imageErrors}
          setImageErrors={setImageErrors}
          onViewLogo={setViewingLogo}
          onStartEdit={startEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
        />

        {editingId && (
          <EditFederationForm
            editForm={editForm}
            setEditForm={setEditForm}
            uploadingEdit={uploadingEdit}
            editingId={editingId}
            imageErrors={imageErrors}
            setImageErrors={setImageErrors}
            onViewLogo={setViewingLogo}
            onSubmit={handleUpdate}
            onClose={cancelEdit}
            onFileChange={handleFileChange(setEditForm)}
          />
        )}
      </div>

      {viewingLogo && (
        <LogoViewerModal logoUrl={viewingLogo} onClose={() => setViewingLogo(null)} />
      )}
    </div>
  )
}
