'use client'

import ArbitresTable from './dashboard/ArbitresTable'
import CreateArbitreForm from './dashboard/CreateArbitreForm'
import EditArbitreForm from './dashboard/EditArbitreForm'
import ImportArbitresCard from './dashboard/ImportArbitresCard'
import PhotoViewerModal from './dashboard/PhotoViewerModal'
import { useAdminDashboard } from './dashboard/useAdminDashboard'

export default function AdminDashboard() {
  const {
    loading,
    error,
    createForm,
    setCreateForm,
    editForm,
    setEditForm,
    editingId,
    setImportFile,
    importMessage,
    importing,
    uploadingCreate,
    uploadingEdit,
    viewingPhoto,
    setViewingPhoto,
    searchQuery,
    setSearchQuery,
    filteredAndSortedArbitres,
    handleFileChange,
    handleCreate,
    startEdit,
    cancelEdit,
    handleUpdate,
    handleImport,
    handleLogout,
  } = useAdminDashboard()

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">Panneau admin</h2>
          <p className="text-gray-500">Gérez les arbitres, les photos et les imports.</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium"
        >
          Déconnexion
        </button>
      </div>

      {error && <div className="p-3 border border-red-200 bg-red-50 text-red-700 rounded">{error}</div>}

      <section className="grid md:grid-cols-2 gap-6" id="ajouter">
        <CreateArbitreForm
          createForm={createForm}
          setCreateForm={setCreateForm}
          uploadingCreate={uploadingCreate}
          onSubmit={handleCreate}
          onFileChange={handleFileChange(setCreateForm)}
        />

        <ImportArbitresCard
          setImportFile={setImportFile}
          importMessage={importMessage}
          importing={importing}
          onSubmit={handleImport}
        />
      </section>

      <ArbitresTable
        arbitres={filteredAndSortedArbitres}
        loading={loading}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        editingId={editingId}
        onStartEdit={startEdit}
        onViewPhoto={setViewingPhoto}
      />

      {editingId && (
        <EditArbitreForm
          editForm={editForm}
          setEditForm={setEditForm}
          uploadingEdit={uploadingEdit}
          onSubmit={handleUpdate}
          onFileChange={handleFileChange(setEditForm)}
          onClose={cancelEdit}
        />
      )}

      {/* Modal pour afficher la photo */}
      {viewingPhoto && (
        <PhotoViewerModal viewingPhoto={viewingPhoto} onClose={() => setViewingPhoto(null)} />
      )}
    </div>
  )
}
