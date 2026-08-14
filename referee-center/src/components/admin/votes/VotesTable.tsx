import Image from 'next/image'
import type { Vote } from './types'
import { formatDate, formatMatchDate } from './utils'

interface VotesTableProps {
  loading: boolean
  votes: Vote[]
  selectAll: boolean
  toggleSelectAll: () => void
  selectedIds: Set<string>
  toggleSelect: (id: string) => void
  openEditModal: (vote: Vote) => void
  deletingId: string | null
  deleteVote: (id: string) => void
  currentPage: number
  totalPages: number
  offset: number
  limit: number
  total: number
  setOffset: (offset: number) => void
}

export default function VotesTable({
  loading,
  votes,
  selectAll,
  toggleSelectAll,
  selectedIds,
  toggleSelect,
  openEditModal,
  deletingId,
  deleteVote,
  currentPage,
  totalPages,
  offset,
  limit,
  total,
  setOffset,
}: VotesTableProps) {
  return (
    <section className="bg-white shadow rounded-lg overflow-hidden">
      {loading ? (
        <div className="p-8 text-center text-gray-500">Chargement...</div>
      ) : votes.length === 0 ? (
        <div className="p-8 text-center text-gray-500">Aucun vote trouve</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left">
                    <input type="checkbox" checked={selectAll} onChange={toggleSelectAll} className="rounded" />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Arbitre</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Match</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date match</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Criteres</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date vote</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {votes.map((vote) => (
                  <tr key={vote.id} className={selectedIds.has(vote.id) ? 'bg-blue-50' : ''}>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <input type="checkbox" checked={selectedIds.has(vote.id)} onChange={() => toggleSelect(vote.id)} className="rounded" />
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {vote.arbitre.photo_url && (
                          <Image src={vote.arbitre.photo_url} alt={vote.arbitre.nom} width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
                        )}
                        <span className="text-sm font-medium text-gray-900">{vote.arbitre.nom}</span>
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{vote.match.equipe_home.nom} vs {vote.match.equipe_away.nom}</div>
                      {vote.match.score_home !== null && vote.match.score_away !== null && (
                        <div className="text-xs text-gray-500">Score: {vote.match.score_home} - {vote.match.score_away}</div>
                      )}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      {vote.match.date ? formatMatchDate(vote.match.date) : '-'}
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {vote.note_globale.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(vote.criteres).map(([key, value]) => (
                          <span key={key} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700" title={key}>
                            {key.split('_').slice(-1)[0]}: {value}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(vote.created_at)}</td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button onClick={() => openEditModal(vote)} className="text-blue-600 hover:text-blue-900">Modifier</button>
                        <button onClick={() => deleteVote(vote.id)} disabled={deletingId === vote.id} className="text-red-600 hover:text-red-900 disabled:opacity-50">
                          {deletingId === vote.id ? '...' : 'Supprimer'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="text-sm text-gray-700">Page {currentPage} sur {totalPages}</div>
              <div className="flex gap-2">
                <button onClick={() => setOffset(Math.max(0, offset - limit))} disabled={offset === 0} className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50">Precedent</button>
                <button onClick={() => setOffset(offset + limit)} disabled={offset + limit >= total} className="px-3 py-1 border rounded text-sm disabled:opacity-50 hover:bg-gray-50">Suivant</button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
