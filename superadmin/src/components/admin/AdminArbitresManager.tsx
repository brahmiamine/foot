'use client'

import ArbitresTable from './arbitres/ArbitresTable'
import CreateArbitreForm from './arbitres/CreateArbitreForm'
import EditArbitreForm from './arbitres/EditArbitreForm'
import PhotoViewerModal from './arbitres/PhotoViewerModal'
import { emptyForm } from './arbitres/constants'
import { useAdminArbitres } from './arbitres/useAdminArbitres'

export default function AdminArbitresManager() {
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
    viewingPhoto,
    setViewingPhoto,
    searchQuery,
    setSearchQuery,
    filteredAndSortedArbitres,
    handleFileChange,
    startEdit,
    cancelEdit,
    handleCreate,
    handleUpdate,
    handleDeletePhoto,
    handleDelete,
  } = useAdminArbitres()

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-md-between gap-3">
        <div>
          <h2 className="mb-1">Gestion des arbitres</h2>
          <p className="text-muted mb-0">Liste et modification des arbitres</p>
        </div>
        <button
          onClick={() => setShowCreateModal(!showCreateModal)}
          className="btn btn-primary"
        >
          {showCreateModal ? 'Annuler' : '+ Ajouter un arbitre'}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger mb-0">{error}</div>
      )}

      {showCreateModal && (
        <CreateArbitreForm
          createForm={createForm}
          setCreateForm={setCreateForm}
          uploadingCreate={uploadingCreate}
          handleFileChange={handleFileChange}
          onSubmit={handleCreate}
          onClose={() => {
            setShowCreateModal(false)
            setCreateForm({ ...emptyForm })
          }}
        />
      )}

      <div className="row g-4">
        <ArbitresTable
          arbitres={filteredAndSortedArbitres}
          loading={loading}
          editingId={editingId}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onStartEdit={startEdit}
          onDelete={handleDelete}
          onViewPhoto={setViewingPhoto}
        />

        {editingId && (
          <EditArbitreForm
            editForm={editForm}
            setEditForm={setEditForm}
            uploadingEdit={uploadingEdit}
            handleFileChange={handleFileChange}
            onDeletePhoto={handleDeletePhoto}
            onSubmit={handleUpdate}
            onClose={cancelEdit}
          />
        )}
      </div>

      {viewingPhoto && (
        <PhotoViewerModal photoUrl={viewingPhoto} onClose={() => setViewingPhoto(null)} />
      )}
    </div>
  )
}
