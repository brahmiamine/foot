'use client'

import { useAdminCardReasons } from './cardReasons/useAdminCardReasons'
import { TYPE_LABELS, TYPE_BADGES } from './cardReasons/types'
import type { CardReasonType } from './cardReasons/types'

export default function AdminCardReasonsManager() {
  const {
    reasons,
    loading,
    error,
    setError,
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
    startEdit,
    cancelEdit,
    handleCreate,
    handleUpdate,
    handleDelete,
  } = useAdminCardReasons()

  return (
    <div className="d-flex flex-column gap-4">
      <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-md-between gap-3">
        <div>
          <h2 className="mb-1">Motifs de carton</h2>
          <p className="text-muted mb-0">Référentiel commun des motifs de cartons jaunes et rouges, utilisé par tous les clubs.</p>
        </div>
        <button type="button" onClick={() => setShowCreateForm(!showCreateForm)} className="btn btn-primary">
          {showCreateForm ? 'Annuler' : '+ Ajouter un motif'}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger d-flex justify-content-between align-items-start mb-0">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Fermer" className="btn-close" />
        </div>
      )}

      {showCreateForm && (
        <div className="card border border-success">
          <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
            <h5 className="card-title mb-0 text-success">Ajouter un motif</h5>
            <button type="button" onClick={() => setShowCreateForm(false)} className="btn-close" aria-label="Fermer" />
          </div>
          <div className="card-body">
            <form className="row g-3" onSubmit={handleCreate}>
              <div className="col-md-6">
                <label className="form-label">Libellé (français) *</label>
                <input
                  type="text"
                  value={createForm.labelFr}
                  onChange={(e) => setCreateForm({ ...createForm, labelFr: e.target.value })}
                  className="form-control"
                  required
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Libellé (arabe)</label>
                <input
                  type="text"
                  value={createForm.labelAr}
                  onChange={(e) => setCreateForm({ ...createForm, labelAr: e.target.value })}
                  className="form-control"
                  dir="rtl"
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Type de carton *</label>
                <select
                  value={createForm.type}
                  onChange={(e) => setCreateForm({ ...createForm, type: e.target.value as CardReasonType })}
                  className="form-select"
                  required
                >
                  <option value="YELLOW">Jaune uniquement</option>
                  <option value="RED">Rouge uniquement</option>
                  <option value="BOTH">Jaune ou rouge</option>
                </select>
              </div>
              <div className="col-md-6 d-flex align-items-end">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="create-active"
                    checked={createForm.isActive}
                    onChange={(e) => setCreateForm({ ...createForm, isActive: e.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="create-active">
                    Actif
                  </label>
                </div>
              </div>
              <div className="col-12">
                <button type="submit" className="btn btn-success" disabled={creating}>
                  {creating ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                      Ajout en cours...
                    </>
                  ) : (
                    'Ajouter'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="row g-4">
        <div className={editingId ? 'col-12 col-lg-8' : 'col-12'}>
          <div className="card">
            <div className="card-body">
              <div className="row g-3 mb-3">
                <div className="col-12 col-sm-8">
                  <input
                    type="text"
                    placeholder="Rechercher un motif..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="form-control"
                  />
                </div>
                <div className="col-12 col-sm-4">
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="form-select">
                    <option value="">Tous les types</option>
                    <option value="YELLOW">Jaune uniquement</option>
                    <option value="RED">Rouge uniquement</option>
                    <option value="BOTH">Jaune ou rouge</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <p className="text-muted mb-0">Chargement...</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Libellé (FR)</th>
                        <th>Libellé (AR)</th>
                        <th>Type</th>
                        <th>Statut</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reasons.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center text-muted py-5">
                            {searchQuery.trim() || filterType ? 'Aucun motif trouvé pour ces filtres' : 'Aucun motif enregistré'}
                          </td>
                        </tr>
                      ) : (
                        reasons.map((reason) => (
                          <tr
                            key={reason.id}
                            className={editingId === reason.id ? 'table-active' : undefined}
                            style={{ cursor: 'pointer' }}
                            onClick={() => startEdit(reason)}
                          >
                            <td className="fw-medium">{reason.labelFr}</td>
                            <td dir="rtl">{reason.labelAr || '—'}</td>
                            <td>
                              <span className={`badge ${TYPE_BADGES[reason.type]}`}>{TYPE_LABELS[reason.type]}</span>
                            </td>
                            <td>
                              {reason.isActive ? (
                                <span className="badge bg-success-subtle text-success">Actif</span>
                              ) : (
                                <span className="badge bg-secondary-subtle text-secondary">Inactif</span>
                              )}
                            </td>
                            <td className="text-end">
                              <div className="d-flex gap-2 justify-content-end">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    startEdit(reason)
                                  }}
                                  className={`btn btn-sm ${editingId === reason.id ? 'btn-primary' : 'btn-outline-primary'}`}
                                >
                                  {editingId === reason.id ? 'En cours...' : 'Modifier'}
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDelete(reason.id)
                                  }}
                                  disabled={deletingId === reason.id}
                                  className="btn btn-sm btn-outline-danger"
                                >
                                  {deletingId === reason.id ? '...' : 'Supprimer'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {editingId && (
          <div className="col-12 col-lg-4">
            <div className="card border border-primary">
              <div className="card-header bg-transparent d-flex align-items-center justify-content-between">
                <h5 className="card-title mb-0 text-primary">Modifier le motif</h5>
                <button type="button" onClick={cancelEdit} className="btn-close" aria-label="Fermer" />
              </div>
              <div className="card-body">
                <form className="row g-3" onSubmit={handleUpdate}>
                  <div className="col-12">
                    <label className="form-label">Libellé (français) *</label>
                    <input
                      type="text"
                      value={editForm.labelFr}
                      onChange={(e) => setEditForm({ ...editForm, labelFr: e.target.value })}
                      className="form-control"
                      required
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Libellé (arabe)</label>
                    <input
                      type="text"
                      value={editForm.labelAr}
                      onChange={(e) => setEditForm({ ...editForm, labelAr: e.target.value })}
                      className="form-control"
                      dir="rtl"
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label">Type de carton *</label>
                    <select
                      value={editForm.type}
                      onChange={(e) => setEditForm({ ...editForm, type: e.target.value as CardReasonType })}
                      className="form-select"
                      required
                    >
                      <option value="YELLOW">Jaune uniquement</option>
                      <option value="RED">Rouge uniquement</option>
                      <option value="BOTH">Jaune ou rouge</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        id="edit-active"
                        checked={editForm.isActive}
                        onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                      />
                      <label className="form-check-label" htmlFor="edit-active">
                        Actif
                      </label>
                    </div>
                  </div>
                  <div className="col-12">
                    <button type="submit" className="btn btn-primary" disabled={savingId === editingId}>
                      {savingId === editingId ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                          Enregistrement...
                        </>
                      ) : (
                        'Enregistrer'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
