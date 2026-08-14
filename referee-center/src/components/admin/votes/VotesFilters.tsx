import { getJourneeDisplayName } from '@/lib/utils'
import type { FilterOptions } from './types'
import { formatMatchDate } from './utils'

interface VotesFiltersProps {
  filterOptions: FilterOptions | null
  matchId: string
  setMatchId: (value: string) => void
  arbitreId: string
  setArbitreId: (value: string) => void
  journeeId: string
  setJourneeId: (value: string) => void
  voteStatus: 'all' | 'voted' | 'not_voted'
  setVoteStatus: (value: 'all' | 'voted' | 'not_voted') => void
  dateFrom: string
  setDateFrom: (value: string) => void
  dateTo: string
  setDateTo: (value: string) => void
  resetFilters: () => void
}

export default function VotesFilters({
  filterOptions,
  matchId,
  setMatchId,
  arbitreId,
  setArbitreId,
  journeeId,
  setJourneeId,
  voteStatus,
  setVoteStatus,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  resetFilters,
}: VotesFiltersProps) {
  return (
    <section className="bg-white shadow rounded-lg p-4 sm:p-6">
      <h2 className="text-lg font-semibold mb-4">Filtres</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Match</label>
          <select
            value={matchId}
            onChange={(e) => setMatchId(e.target.value)}
            className="border rounded px-3 py-2 text-sm w-full"
          >
            <option value="">Tous les matchs</option>
            {filterOptions?.matches
              .filter((match) => {
                const voteCount = match.vote_count || 0
                if (voteStatus === 'voted') return voteCount > 0
                if (voteStatus === 'not_voted') return voteCount === 0
                return true
              })
              .map((match) => {
                const journeeNum = match.journee?.numero
                const journeeLabel = journeeNum !== null && journeeNum !== undefined
                  ? `J${journeeNum}`
                  : ''
                const voteCount = match.vote_count || 0
                return (
                  <option key={match.id} value={match.id}>
                    {journeeLabel && `[${journeeLabel}] `}
                    {match.equipe_home.nom} vs {match.equipe_away.nom}
                    {match.date ? ` (${formatMatchDate(match.date)})` : ''}
                    {` - ${voteCount} vote${voteCount !== 1 ? 's' : ''}`}
                  </option>
                )
              })}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Arbitre</label>
          <select
            value={arbitreId}
            onChange={(e) => setArbitreId(e.target.value)}
            className="border rounded px-3 py-2 text-sm w-full"
          >
            <option value="">Tous les arbitres</option>
            {filterOptions?.arbitres.map((arbitre) => (
              <option key={arbitre.id} value={arbitre.id}>{arbitre.nom}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Journee</label>
          <select
            value={journeeId}
            onChange={(e) => setJourneeId(e.target.value)}
            className="border rounded px-3 py-2 text-sm w-full"
          >
            <option value="">Toutes les journees</option>
            {filterOptions?.journees.map((journee) => (
              <option key={journee.id} value={journee.id}>
                {getJourneeDisplayName(journee, 'fr')}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Statut vote</label>
          <select
            value={voteStatus}
            onChange={(e) => setVoteStatus(e.target.value as 'all' | 'voted' | 'not_voted')}
            className="border rounded px-3 py-2 text-sm w-full"
          >
            <option value="all">Tous</option>
            <option value="voted">Matchs votés</option>
            <option value="not_voted">Matchs non votés</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date vote (debut)</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border rounded px-3 py-2 text-sm w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date vote (fin)</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border rounded px-3 py-2 text-sm w-full"
          />
        </div>
      </div>

      {(matchId || arbitreId || journeeId || dateFrom || dateTo || voteStatus !== 'all') && (
        <div className="mt-4">
          <button onClick={resetFilters} className="text-sm text-blue-600 hover:underline">
            Reinitialiser les filtres
          </button>
        </div>
      )}
    </section>
  )
}
