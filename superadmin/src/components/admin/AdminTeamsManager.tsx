'use client'

import CreateTeamForm from './teams/CreateTeamForm'
import EditTeamForm from './teams/EditTeamForm'
import TeamBrandingPanel from './teams/TeamBrandingPanel'
import AffiliationsPanel from './teams/AffiliationsPanel'
import ImportTeamsModal from './teams/ImportTeamsModal'
import TeamsTable from './teams/TeamsTable'
import { AGE_CATEGORY_LABELS, emptyForm, GENDER_LABELS, getCountryLabel, SPORT_LABELS, TEAM_TYPE_LABELS } from './teams/constants'
import { useAdminTeams } from './teams/useAdminTeams'

export default function AdminTeamsManager() {
  const {
    filterOptions,
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
    showImportModal,
    setShowImportModal,
    importing,
    importResult,
    fileInputRef,
    searchQuery,
    setSearchQuery,
    filterTeamType,
    setFilterTeamType,
    filterSport,
    setFilterSport,
    filterAgeCategory,
    setFilterAgeCategory,
    filterGender,
    setFilterGender,
    filterCountry,
    setFilterCountry,
    filteredTeams,
    startEdit,
    cancelEdit,
    handleCreate,
    handleUpdate,
    handleDelete,
    handleFileSelect,
    closeImportModal,
    downloadSampleJson,
  } = useAdminTeams()

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-md-between gap-3">
        <div>
          <h2 className="mb-1">Gestion des équipes</h2>
          <p className="text-muted mb-0">Liste et modification des équipes</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button
            onClick={() => setShowImportModal(true)}
            className="btn btn-success"
          >
            📥 Importer JSON
          </button>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn btn-primary"
          >
            {showCreateForm ? 'Annuler' : '+ Ajouter une équipe'}
          </button>
        </div>
      </div>

      {/* Modal d'import */}
      {showImportModal && (
        <ImportTeamsModal
          importing={importing}
          importResult={importResult}
          error={error}
          fileInputRef={fileInputRef}
          onFileSelect={handleFileSelect}
          onDownloadSample={downloadSampleJson}
          onClose={closeImportModal}
        />
      )}

      {error && (
        <div className="alert alert-danger mb-0">{error}</div>
      )}

      {/* Formulaire de création */}
      {showCreateForm && (
        <CreateTeamForm
          createForm={createForm}
          setCreateForm={setCreateForm}
          creating={creating}
          onSubmit={handleCreate}
          onClose={() => {
            setShowCreateForm(false)
            setCreateForm(emptyForm)
          }}
        />
      )}

      <div className="card shadow-sm border-0">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-12 col-sm-6 col-lg-3">
              <label className="form-label">Recherche</label>
              <input
                type="text"
                placeholder="Nom, abréviation, ville..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-control"
              />
            </div>
            <div className="col-6 col-lg-2">
              <label className="form-label">Type</label>
              <select
                value={filterTeamType}
                onChange={(e) => setFilterTeamType(e.target.value as typeof filterTeamType)}
                className="form-select"
              >
                <option value="all">Tous les types</option>
                {Object.entries(TEAM_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="col-6 col-lg-2">
              <label className="form-label">Pays</label>
              <select
                value={filterCountry}
                onChange={(e) => setFilterCountry(e.target.value)}
                className="form-select"
              >
                <option value="all">Tous les pays</option>
                {filterOptions?.countries.map((code) => (
                  <option key={code} value={code}>{getCountryLabel(code)}</option>
                ))}
              </select>
            </div>
            <div className="col-6 col-lg-2">
              <label className="form-label">Sport</label>
              <select
                value={filterSport}
                onChange={(e) => setFilterSport(e.target.value as typeof filterSport)}
                className="form-select"
              >
                <option value="all">Tous les sports</option>
                {Object.entries(SPORT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="col-6 col-lg-3">
              <label className="form-label">Catégorie</label>
              <select
                value={filterAgeCategory}
                onChange={(e) => setFilterAgeCategory(e.target.value as typeof filterAgeCategory)}
                className="form-select"
              >
                <option value="all">Toutes les catégories</option>
                {Object.entries(AGE_CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="col-6 col-lg-2">
              <label className="form-label">Genre</label>
              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value as typeof filterGender)}
                className="form-select"
              >
                <option value="all">Tous les genres</option>
                {Object.entries(GENDER_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4">
        <TeamsTable
          teams={filteredTeams}
          loading={loading}
          editingId={editingId}
          deletingId={deletingId}
          searchQuery={searchQuery}
          filterTeamType={filterTeamType}
          filterSport={filterSport}
          filterAgeCategory={filterAgeCategory}
          filterGender={filterGender}
          filterCountry={filterCountry}
          onStartEdit={startEdit}
          onDelete={handleDelete}
        />

        {editingId && (
          <EditTeamForm
            editForm={editForm}
            setEditForm={setEditForm}
            savingId={savingId}
            editingId={editingId}
            onSubmit={handleUpdate}
            onClose={cancelEdit}
          />
        )}

        {editingId && <TeamBrandingPanel teamId={editingId} />}
        {editingId && <AffiliationsPanel teamId={editingId} />}
      </div>
    </div>
  )
}
