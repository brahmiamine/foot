'use client'

import { getJourneeDisplayName } from '@/lib/utils'
import MatchesTable from './matches/MatchesTable'
import NewMatchForm from './matches/NewMatchForm'
import { useAdminMatches } from './matches/useAdminMatches'
import { formatSaisonLabel } from './matches/utils'

export default function AdminMatchesManager() {
  const {
    locale,
    arbitres,
    teams,
    edits,
    newForm,
    setNewForm,
    loading,
    error,
    savingId,
    creating,
    deletingId,
    cancelingId,
    showNewForm,
    setShowNewForm,
    selectedSaisonId,
    setSelectedSaisonId,
    selectedJourneeId,
    setSelectedJourneeId,
    sortedSaisons,
    journeesOfSelectedSaison,
    sortedMatches,
    loadMatches,
    updateEdit,
    hasChanges,
    handleSave,
    handleCreate,
    handleDelete,
    handleCancel,
  } = useAdminMatches()

  return (
    <div className="d-flex flex-column gap-4">
      <header className="d-flex flex-column flex-md-row align-items-md-center justify-content-md-between gap-3">
        <div>
          <p className="text-muted text-uppercase small mb-1">Matchs</p>
          <h1 className="mb-1">Gestion des matchs</h1>
          <p className="text-muted mb-0">Ajoutez, modifiez ou supprimez des matchs.</p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button
            onClick={() => setShowNewForm(!showNewForm)}
            className="btn btn-success btn-sm"
            disabled={loading || !selectedJourneeId}
          >
            {showNewForm ? 'Annuler' : '+ Ajouter'}
          </button>
          <button
            onClick={loadMatches}
            className="btn btn-light btn-sm border"
            disabled={loading}
          >
            Rafraîchir
          </button>
        </div>
      </header>

      {error && <div className="alert alert-danger mb-0">{error}</div>}

      {showNewForm && selectedJourneeId && (
        <NewMatchForm
          newForm={newForm}
          setNewForm={setNewForm}
          journeesOfSelectedSaison={journeesOfSelectedSaison}
          teams={teams}
          arbitres={arbitres}
          creating={creating}
          locale={locale}
          onSubmit={handleCreate}
        />
      )}

      <section className="card shadow-sm border-0">
        <div className="card-body">
        <div className="mb-4 d-flex flex-column flex-md-row align-items-md-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <label htmlFor="saison-filter" className="form-label mb-0 text-nowrap">
              Filtrer par saison:
            </label>
            <select
              id="saison-filter"
              value={selectedSaisonId}
              onChange={(e) => setSelectedSaisonId(e.target.value)}
              className="form-select form-select-sm"
              style={{ minWidth: '280px' }}
            >
              {sortedSaisons.map((saison) => (
                <option key={saison.id} value={saison.id}>
                  {formatSaisonLabel(saison)}
                </option>
              ))}
            </select>
          </div>
          <div className="d-flex align-items-center gap-2">
            <label htmlFor="journee-filter" className="form-label mb-0 text-nowrap">
              Filtrer par journée de cette saison:
            </label>
            <select
              id="journee-filter"
              value={selectedJourneeId}
              onChange={(e) => setSelectedJourneeId(e.target.value)}
              className="form-select form-select-sm"
              style={{ minWidth: '280px' }}
            >
              {journeesOfSelectedSaison.map((journee) => (
                <option key={journee.id} value={journee.id}>
                  {getJourneeDisplayName(journee, locale)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <MatchesTable
          loading={loading}
          sortedMatches={sortedMatches}
          edits={edits}
          teams={teams}
          arbitres={arbitres}
          locale={locale}
          savingId={savingId}
          deletingId={deletingId}
          cancelingId={cancelingId}
          updateEdit={updateEdit}
          hasChanges={hasChanges}
          handleSave={handleSave}
          handleDelete={handleDelete}
          handleCancel={handleCancel}
        />
        </div>
      </section>
    </div>
  )
}
