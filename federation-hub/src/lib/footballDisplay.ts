export const LIVE_STATUSES = new Set(['1H', '2H', 'HT', 'ET', 'BT', 'P', 'SUSP', 'INT'])
export const FINISHED_STATUSES = new Set(['FT', 'AET', 'PEN'])

export function statusBadge(status: { short: string; long: string; elapsed: number | null }) {
  if (LIVE_STATUSES.has(status.short)) {
    return {
      label: status.elapsed ? `${status.elapsed}'` : 'EN DIRECT',
      className: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 animate-pulse',
    }
  }
  if (FINISHED_STATUSES.has(status.short)) {
    return { label: 'Terminé', className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' }
  }
  if (status.short === 'NS') {
    return { label: 'À venir', className: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' }
  }
  return { label: status.long, className: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' }
}

export function formatFixtureDate(iso: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Tunis',
  }).format(new Date(iso))
}

export function eventIcon(type: string, detail: string): string {
  if (type === 'Goal') return detail === 'Missed Penalty' ? '❌' : '⚽'
  if (type === 'Card') return detail === 'Red Card' ? '🟥' : '🟨'
  if (type === 'subst') return '🔄'
  if (type === 'Var') return '📺'
  return '•'
}
