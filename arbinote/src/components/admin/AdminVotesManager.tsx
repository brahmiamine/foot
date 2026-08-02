'use client'

import EditVoteModal from './votes/EditVoteModal'
import VotesFilters from './votes/VotesFilters'
import VotesTable from './votes/VotesTable'
import { useAdminVotes } from './votes/useAdminVotes'

export default function AdminVotesManager() {
  const {
    votes,
    total,
    loading,
    error,
    filterOptions,
    matchId,
    setMatchId,
    arbitreId,
    setArbitreId,
    journeeId,
    setJourneeId,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    voteStatus,
    setVoteStatus,
    limit,
    offset,
    setOffset,
    selectedIds,
    selectAll,
    editModal,
    setEditModal,
    saving,
    deletingId,
    bulkDeleting,
    loadVotes,
    buildExportUrl,
    toggleSelect,
    toggleSelectAll,
    openEditModal,
    saveEdit,
    deleteVote,
    bulkDelete,
    resetFilters,
    currentPage,
    totalPages,
  } = useAdminVotes()

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500 uppercase tracking-wide">Votes</p>
          <h1 className="text-2xl sm:text-3xl font-bold">Gestion des votes</h1>
          <p className="text-gray-500 mt-1">{total} vote(s) au total</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selectedIds.size > 0 && (
            <button
              onClick={bulkDelete}
              disabled={bulkDeleting}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {bulkDeleting ? 'Suppression...' : `Supprimer (${selectedIds.size})`}
            </button>
          )}
          <a
            href={buildExportUrl()}
            className="px-4 py-2 border rounded hover:bg-gray-50 inline-flex items-center"
          >
            Exporter en CSV
          </a>
          <button
            onClick={() => loadVotes()}
            disabled={loading}
            className="px-4 py-2 border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Rafraichir
          </button>
        </div>
      </header>

      {error && (
        <div className="p-3 border border-red-200 bg-red-50 text-red-700 rounded">{error}</div>
      )}

      <VotesFilters
        filterOptions={filterOptions}
        matchId={matchId}
        setMatchId={setMatchId}
        arbitreId={arbitreId}
        setArbitreId={setArbitreId}
        journeeId={journeeId}
        setJourneeId={setJourneeId}
        voteStatus={voteStatus}
        setVoteStatus={setVoteStatus}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        resetFilters={resetFilters}
      />

      <VotesTable
        loading={loading}
        votes={votes}
        selectAll={selectAll}
        toggleSelectAll={toggleSelectAll}
        selectedIds={selectedIds}
        toggleSelect={toggleSelect}
        openEditModal={openEditModal}
        deletingId={deletingId}
        deleteVote={deleteVote}
        currentPage={currentPage}
        totalPages={totalPages}
        offset={offset}
        limit={limit}
        total={total}
        setOffset={setOffset}
      />

      {editModal && (
        <EditVoteModal
          editModal={editModal}
          setEditModal={setEditModal}
          saving={saving}
          saveEdit={saveEdit}
          onClose={() => setEditModal(null)}
        />
      )}
    </div>
  )
}
